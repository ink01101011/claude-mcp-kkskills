#!/usr/bin/env node
/**
 * kkskills-mcp — an MCP server that exposes a personal Claude skill library
 * as discoverable tools over stdio.
 *
 * Tools exposed:
 *   - list_skills:  returns every skill with name + description (used by the
 *                   AI to decide which skill is relevant).
 *   - read_skill:   takes a skill name, returns the full SKILL.md content.
 *   - search_skills: free-text search across name/description/body.
 *
 * Skills live in <repo>/skills/<skill-name>/SKILL.md and are discovered at
 * startup. Frontmatter is parsed with gray-matter.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default skills root: <repo>/skills (i.e. two levels up from dist/index.js)
// Override with KKSKILLS_ROOT env var if the server runs from a different cwd.
const SKILLS_ROOT =
  process.env.KKSKILLS_ROOT ?? resolve(__dirname, "..", "..", "skills");

interface Skill {
  name: string;
  description: string;
  filePath: string;
  body: string;
  raw: string;
}

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

function buildServer(skills: Skill[]) {
  const server = new Server(
    {
      name: "kkskills-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "list_skills",
        description:
          "List all available skills with their name and description. Call this first when you need to find a relevant skill for the current conversation. Skills cover the user's response-style preferences, the trader-platform project, sprint roadmap, recurring feedback patterns, and reference material on external providers.",
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
        content: [
          {
            type: "text",
            text: JSON.stringify(summary, null, 2),
          },
        ],
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
        content: [
          {
            type: "text",
            text: skill.raw,
          },
        ],
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
        content: [
          {
            type: "text",
            text: JSON.stringify(hits, null, 2),
          },
        ],
      };
    }

    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}`,
        },
      ],
    };
  });

  return server;
}

async function main() {
  const skills = await loadSkills(SKILLS_ROOT);
  process.stderr.write(
    `[kkskills-mcp] Loaded ${skills.length} skill(s) from ${SKILLS_ROOT}\n`
  );
  const server = buildServer(skills);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[kkskills-mcp] Listening on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`[kkskills-mcp] Fatal: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
