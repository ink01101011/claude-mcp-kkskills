# claude-mcp-kkskills

A personal Claude skill library exposed as an MCP server.

The repo holds two things:

1. **A skill library** under `skills/` — one folder per skill, each containing a `SKILL.md` that defines triggers, process steps, rules, and examples.
2. **A stdio MCP server** under `mcp-server/` — a TypeScript Node server that exposes the skills as discoverable tools to any MCP-aware host (Claude Desktop, Cowork, Cursor, etc.).

## Why

Skills as flat files only help if a host knows where to look. The MCP server makes them protocol-addressable: a host calls `list_skills`, picks the relevant one, calls `read_skill`, and applies the content. The library can grow without changing host configuration.

## What's in the library

| Skill                              | When it applies                                                |
|------------------------------------|----------------------------------------------------------------|
| `user-profile`                     | Calibrating tone, register, response style.                     |
| `project-trader-platform`          | Working in the trader-platform project context.                 |
| `project-sprint-roadmap`           | Scoping/planning re-architecture work.                          |
| `feedback-no-duplicate-docs`       | Avoiding parallel tracking docs (CHECKLIST/TODO/TESTING drift). |
| `feedback-use-full-filenames`      | Referencing dated project docs unambiguously.                   |
| `feedback-verify-with-real-data`   | Grounding claims in grep/probe, not assumption.                 |
| `feedback-additive-changes`        | Refactors stay additive; legacy code stays dormant, not deleted.|
| `reference-trader-platform-layout` | File paths, naming conventions, deploy commands.                |
| `reference-external-providers`     | External API rate limits, plan tiers, quirks.                   |

See `CLAUDE.md` for the maintenance rules — when to update an existing skill vs. add a new one — and `SKILL_TEMPLATE.md` for the structure each skill follows.

## Install

```bash
git clone https://github.com/<your-username>/claude-mcp-kkskills.git
cd claude-mcp-kkskills/mcp-server
npm install
npm run build
```

## Wire into Claude Desktop / Cowork

Add to your MCP server config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

To point at a skills directory in a different location:

```json
{
  "mcpServers": {
    "kkskills": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"],
      "env": {
        "KKSKILLS_ROOT": "/absolute/path/to/skills"
      }
    }
  }
}
```

Restart the host. Three tools appear under the `kkskills` server:

| Tool            | Use                                                                 |
|-----------------|---------------------------------------------------------------------|
| `list_skills`   | Returns every skill with name + description. Call this first.       |
| `read_skill`    | Returns the full `SKILL.md` content for one skill by name.          |
| `search_skills` | Free-text search across name, description, and body.                |

## Add a new skill

1. Read `CLAUDE.md` first — most patterns belong in an existing skill, not a new one.
2. If a new one is justified: copy `SKILL_TEMPLATE.md` to `skills/<kebab-name>/SKILL.md` and fill it in.
3. Rebuild and restart:
   ```bash
   cd mcp-server && npm run build
   ```
4. Restart the host so it re-spawns the server.

## Update an existing skill

1. `Edit` the relevant `skills/<name>/SKILL.md` section.
2. If triggers change, update the `description` field in the frontmatter.
3. Rebuild and restart as above.

## Layout

```
claude-mcp-kkskills/
├── skills/
│   ├── user-profile/SKILL.md
│   ├── project-trader-platform/SKILL.md
│   ├── project-sprint-roadmap/SKILL.md
│   ├── feedback-no-duplicate-docs/SKILL.md
│   ├── feedback-use-full-filenames/SKILL.md
│   ├── feedback-verify-with-real-data/SKILL.md
│   ├── feedback-additive-changes/SKILL.md
│   ├── reference-trader-platform-layout/SKILL.md
│   └── reference-external-providers/SKILL.md
├── mcp-server/
│   ├── src/index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── SKILL_TEMPLATE.md
├── CLAUDE.md
├── README.md
└── .gitignore
```

## License

MIT.
