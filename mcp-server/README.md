# kkskills-mcp

A local stdio MCP server that exposes a personal Claude skill library
(`../skills/*/SKILL.md`) as discoverable tools.

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

Output goes to `dist/index.js`.

## Run locally

```bash
node dist/index.js
```

The server prints status to `stderr` and serves the MCP protocol on `stdio`.
It does nothing useful on its own — you wire it into a host (Claude Desktop,
Cowork, Cursor, etc.).

## Wire into Claude Desktop / Cowork

Add an entry to your MCP server config. The exact location depends on the
host:

- **Claude Desktop (macOS):**
  `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Cowork:** add via the MCP registry / connector UI, pointing at the
  command and args below.

```json
{
  "mcpServers": {
    "kkskills": {
      "command": "node",
      "args": [
        "/absolute/path/to/claude-mcp-kkskills/mcp-server/dist/index.js"
      ]
    }
  }
}
```

If you move the repo or want to point at a different skills folder, set
`KKSKILLS_ROOT`:

```json
{
  "mcpServers": {
    "kkskills": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "KKSKILLS_ROOT": "/path/to/skills"
      }
    }
  }
}
```

Restart the host. The three tools (`list_skills`, `read_skill`,
`search_skills`) will appear under the `kkskills` server.

## Add a new skill

1. Create `../skills/<kebab-name>/SKILL.md` following the template in the
   repo root (`SKILL_TEMPLATE.md`).
2. Restart the MCP server — skills are loaded on startup.

See the repo's `CLAUDE.md` for when to add a new skill vs. update an existing one.

## Why a server and not just files on disk?

Skills as flat files only help if a host knows where to look. The MCP
server makes them protocol-addressable, so any MCP-aware host (Claude
Desktop, Cowork, Cursor, etc.) can discover and load them uniformly.
