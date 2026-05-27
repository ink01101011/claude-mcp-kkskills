# kkskills-mcp

A local MCP server that exposes a personal Claude skill library
(`../skills/*/SKILL.md`) as discoverable tools over **stdio** or **Streamable HTTP**.

## What it does

Three tools are exposed over the Model Context Protocol:

| Tool            | Purpose                                                                                |
|-----------------|----------------------------------------------------------------------------------------|
| `list_skills`   | Returns every skill with `name` and `description` — call first to find relevant ones.  |
| `read_skill`    | Returns the full `SKILL.md` content for one skill by name.                             |
| `search_skills` | Free-text search across name, description, and body. Returns matching skills + snippet.|

Skills are discovered at server start from `<repo>/skills/*/SKILL.md`. Each skill
is a folder containing a single `SKILL.md` with YAML frontmatter (`name`,
`description`) followed by the skill body.

## Build

```bash
cd mcp-server
npm install
npm run build
```

Output: `dist/index.js`.

## Run

### stdio (default)

```bash
node dist/index.js
```

For local MCP hosts that spawn the server as a subprocess (Claude Desktop,
Claude Code, Cowork, Cursor).

### Streamable HTTP

```bash
node dist/index.js --http                     # 127.0.0.1:3030
node dist/index.js --http --port 4000         # custom port
node dist/index.js --http --host 0.0.0.0      # expose externally
```

For remote MCP hosts (claude.ai custom connectors, or any host that connects
over the network). Endpoints:

- `POST /mcp` — JSON-RPC 2.0 over HTTP (stateless, JSON response).
- `GET /healthz` — plain-text health check that also reports skill count.

### Configuration — flag > env > default

| Flag              | Env var                    | Default          |
|-------------------|----------------------------|------------------|
| `--stdio`         | `KKSKILLS_TRANSPORT=stdio` | `stdio`          |
| `--http`          | `KKSKILLS_TRANSPORT=http`  | `stdio`          |
| `--port <n>`      | `KKSKILLS_PORT`            | `3030`           |
| `--host <h>`      | `KKSKILLS_HOST`            | `127.0.0.1`      |
| `--skills <path>` | `KKSKILLS_ROOT`            | `<repo>/skills`  |
| `--help`          | —                          | —                |

CLI flags always override env vars when both are set, so a system-wide
`KKSKILLS_TRANSPORT=http` can be overridden per-invocation with `--stdio`.

## Wire into a host

See the repo root `README.md` for step-by-step instructions for:
- Claude Desktop (macOS / Windows)
- Claude Code (CLI)
- Cowork
- Cursor / Continue.dev
- claude.ai web (remote connector via HTTP)

## Add a new skill

1. Create `../skills/<kebab-name>/SKILL.md` following `../SKILL_TEMPLATE.md`.
2. Restart the MCP server (skills load at startup).

See `../CLAUDE.md` for when to add a new skill vs. update an existing one.
