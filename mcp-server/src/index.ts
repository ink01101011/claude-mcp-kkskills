#!/usr/bin/env node
/**
 * kkskills-mcp — an MCP server that exposes a personal Claude skill library
 * as discoverable tools.
 *
 * Tools exposed:
 *   - list_skills:   returns every skill with name + description (used by the
 *                    AI to decide which skill is relevant).
 *   - read_skill:    takes a skill name, returns the full SKILL.md content.
 *   - search_skills: free-text search across name/description/body.
 *
 * Skills live in <repo>/skills/<skill-name>/SKILL.md and are discovered at
 * startup. Frontmatter is parsed with gray-matter.
 *
 * Transport:
 *   Default = stdio (for Claude Desktop / Claude Code / Cowork / Cursor).
 *   --http  | KKSKILLS_TRANSPORT=http → Streamable HTTP (for claude.ai remote
 *                                       connector, or any remote MCP host).
 *
 * CLI flags always win over env vars when both are set.
 *
 *   Flag           Env var               Default            Purpose
 *   ----           -------               -------            -------
 *   --http         KKSKILLS_TRANSPORT    stdio              Switch transport
 *   --stdio        KKSKILLS_TRANSPORT    stdio              Force stdio
 *   --port <n>     KKSKILLS_PORT         3030               HTTP listen port
 *   --host <h>     KKSKILLS_HOST         127.0.0.1          HTTP bind address
 *   --skills <p>   KKSKILLS_ROOT         <repo>/skills      Skills root dir
 *   --help         —                     —                  Print usage
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "node:http";
import matter from "gray-matter";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

interface Skill {
  name: string;
  description: string;
  filePath: string;
  body: string;
  raw: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

interface CliFlags {
  transport?: "stdio" | "http";
  port?: number;
  host?: string;
  skillsRoot?: string;
  help?: boolean;
}

function parseArgs(argv: string[]): CliFlags {
  const flags: CliFlags = {};
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const eat = (): string => {
      const next = args[++i];
      if (next === undefined) throw new Error(`Missing value for flag '${a}'`);
      return next;
    };
    if (a === "--http") flags.transport = "http";
    else if (a === "--stdio") flags.transport = "stdio";
    else if (a === "--port") flags.port = Number(eat());
    else if (a.startsWith("--port=")) flags.port = Number(a.slice("--port=".length));
    else if (a === "--host") flags.host = eat();
    else if (a.startsWith("--host=")) flags.host = a.slice("--host=".length);
    else if (a === "--skills") flags.skillsRoot = eat();
    else if (a.startsWith("--skills=")) flags.skillsRoot = a.slice("--skills=".length);
    else if (a === "--help" || a === "-h") flags.help = true;
    else throw new Error(`Unknown flag: ${a}`);
  }
  return flags;
}

interface ResolvedConfig {
  transport: "stdio" | "http";
  port: number;
  host: string;
  skillsRoot: string;
}

/**
 * Flag wins over env var. Env wins over default.
 */
function resolveConfig(flags: CliFlags): ResolvedConfig {
  const envTransport =
    process.env.KKSKILLS_TRANSPORT === "http"
      ? ("http" as const)
      : process.env.KKSKILLS_TRANSPORT === "stdio"
        ? ("stdio" as const)
        : undefined;

  const envPort = process.env.KKSKILLS_PORT ? Number(process.env.KKSKILLS_PORT) : undefined;

  const transport = flags.transport ?? envTransport ?? "stdio";
  const port = flags.port ?? envPort ?? 3030;
  const host = flags.host ?? process.env.KKSKILLS_HOST ?? "127.0.0.1";
  const skillsRoot =
    flags.skillsRoot ?? process.env.KKSKILLS_ROOT ?? resolve(__dirname, "..", "..", "skills");

  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid port: ${port}`);
  }

  return { transport, port, host, skillsRoot };
}

function printHelp(): void {
  process.stdout.write(
    `kkskills-mcp — MCP server exposing a personal Claude skill library

Usage:
  kkskills-mcp [options]

Options:
  --stdio                Use stdio transport (default).
  --http                 Use Streamable HTTP transport.
  --port <n>             HTTP listen port (default 3030).
  --host <h>             HTTP bind address (default 127.0.0.1).
  --skills <path>        Skills root directory (default <repo>/skills).
  -h, --help             Show this help.

Environment (overridden by flags):
  KKSKILLS_TRANSPORT     stdio | http
  KKSKILLS_PORT          HTTP listen port
  KKSKILLS_HOST          HTTP bind address
  KKSKILLS_ROOT          Skills root directory

Examples:
  kkskills-mcp                              # stdio, default skills
  kkskills-mcp --http --port 4000           # HTTP on 0.0.0.0:4000 if --host 0.0.0.0
  KKSKILLS_TRANSPORT=http kkskills-mcp      # HTTP via env
  kkskills-mcp --stdio                      # force stdio even if env says http
`
  );
}

// ─── Skill loading ───────────────────────────────────────────────────────────

async function loadSkills(root: string): Promise<Skill[]> {
  const skills: Skill[] = [];
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch (err) {
    process.stderr.write(
      `[kkskills-mcp] Could not read skills root '${root}': ${(err as Error).message}\n`
    );
    return skills;
  }

  for (const entry of entries) {
    const skillDir = join(root, entry);
    const skillFile = join(skillDir, "SKILL.md");
    try {
      const s = await stat(skillFile);
      if (!s.isFile()) continue;
    } catch {
      continue; // not a skill dir
    }

    const raw = await readFile(skillFile, "utf-8");
    const parsed = matter(raw);
    const name = String(parsed.data.name ?? entry);
    const description = String(parsed.data.description ?? "").trim();
    skills.push({
      name,
      description,
      filePath: skillFile,
      body: parsed.content,
      raw,
    });
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

// ─── MCP server (tools) ──────────────────────────────────────────────────────

function buildServer(skills: Skill[]): Server {
  const server = new Server({ name: "kkskills-mcp", version }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "list_skills",
        description:
          "List all available skills with their name and description. Call this first when you need to find a relevant skill for the current conversation. Skills cover the user's response-style preferences, project-specific context (trader-platform), recurring feedback patterns (no duplicate docs, additive changes, expand-contract migrations, verify with real data), and reference material (Clean Architecture across stacks, Conventional Commits format, external API providers, repo layout).",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: "read_skill",
        description:
          "Read the full content of a specific skill by name. Use this after list_skills identifies a relevant one. Returns the SKILL.md body including Overview, When to Use, Process, Rules & Constraints, and Examples.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "The skill name (as returned by list_skills), e.g. 'feedback-additive-changes'.",
            },
          },
          required: ["name"],
          additionalProperties: false,
        },
      },
      {
        name: "search_skills",
        description:
          "Free-text search across all skills (name, description, body). Returns matching skills with a short snippet. Useful when you don't know the exact skill name.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Free-text query. Case-insensitive substring match across name, description, and body.",
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;

    if (name === "list_skills") {
      const summary = skills.map((s) => ({
        name: s.name,
        description: s.description,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    }

    if (name === "read_skill") {
      const skillName = String((args as { name?: string })?.name ?? "");
      const skill = skills.find((s) => s.name === skillName);
      if (!skill) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Skill '${skillName}' not found. Available: ${skills
                .map((s) => s.name)
                .join(", ")}`,
            },
          ],
        };
      }
      return {
        content: [{ type: "text", text: skill.raw }],
      };
    }

    if (name === "search_skills") {
      const query = String((args as { query?: string })?.query ?? "")
        .trim()
        .toLowerCase();
      if (!query) {
        return {
          isError: true,
          content: [{ type: "text", text: "Empty query." }],
        };
      }
      const hits = skills
        .map((s) => {
          const hay = `${s.name}\n${s.description}\n${s.body}`.toLowerCase();
          const idx = hay.indexOf(query);
          if (idx < 0) return null;
          const start = Math.max(0, idx - 60);
          const end = Math.min(hay.length, idx + query.length + 60);
          const snippet = `${start > 0 ? "..." : ""}${hay
            .slice(start, end)
            .replace(/\s+/g, " ")}${end < hay.length ? "..." : ""}`;
          return { name: s.name, description: s.description, snippet };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      return {
        content: [{ type: "text", text: JSON.stringify(hits, null, 2) }],
      };
    }

    return {
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
    };
  });

  return server;
}

// ─── Transport: stdio ────────────────────────────────────────────────────────

async function startStdio(skills: Skill[]): Promise<void> {
  const server = buildServer(skills);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[kkskills-mcp] Listening on stdio\n");
}

// ─── Transport: Streamable HTTP (stateless) ──────────────────────────────────

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return undefined;
  const text = Buffer.concat(chunks).toString("utf-8");
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function startHttp(skills: Skill[], port: number, host: string): Promise<void> {
  const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? host}`);

    // Health check
    if (req.method === "GET" && url.pathname === "/healthz") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(`ok\nloaded ${skills.length} skill(s)\n`);
      return;
    }

    // MCP endpoint
    if (url.pathname !== "/mcp") {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found. Try POST /mcp or GET /healthz.\n");
      return;
    }

    try {
      // Stateless mode: fresh server + transport per request.
      // Simpler for a personal skill library; no session continuity needed
      // because tool calls are independent.
      const server = buildServer(skills);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
        enableJsonResponse: true, // respond with JSON, no SSE required
      });

      res.on("close", () => {
        transport.close().catch(() => {});
        server.close().catch(() => {});
      });

      await server.connect(transport);

      const body = req.method === "POST" ? await readBody(req) : undefined;
      await transport.handleRequest(req, res, body);
    } catch (err) {
      process.stderr.write(`[kkskills-mcp] HTTP handler error: ${(err as Error).stack ?? err}\n`);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          })
        );
      } else {
        res.end();
      }
    }
  });

  await new Promise<void>((resolveListen) => {
    httpServer.listen(port, host, () => {
      process.stderr.write(`[kkskills-mcp] HTTP listening on http://${host}:${port}/mcp\n`);
      process.stderr.write(`[kkskills-mcp] Health: http://${host}:${port}/healthz\n`);
      resolveListen();
    });
  });

  // Hold the process open
  await new Promise<void>(() => {});
}

// ─── Entrypoint ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  let flags: CliFlags;
  try {
    flags = parseArgs(process.argv);
  } catch (err) {
    process.stderr.write(`[kkskills-mcp] ${(err as Error).message}\n`);
    printHelp();
    process.exit(2);
  }

  if (flags.help) {
    printHelp();
    return;
  }

  const config = resolveConfig(flags);

  const skills = await loadSkills(config.skillsRoot);
  process.stderr.write(
    `[kkskills-mcp] Loaded ${skills.length} skill(s) from ${config.skillsRoot}\n`
  );
  process.stderr.write(`[kkskills-mcp] Transport: ${config.transport}\n`);

  if (config.transport === "http") {
    await startHttp(skills, config.port, config.host);
  } else {
    await startStdio(skills);
  }
}

main().catch((err) => {
  process.stderr.write(`[kkskills-mcp] Fatal: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
