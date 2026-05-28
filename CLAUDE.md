# CLAUDE.md — Maintaining this Skill Set

This file is the standing instruction for any AI agent (Claude, or any other model) working in this repo. It defines when to **update** an existing skill and when to **add** a new one.

> **Forked this repo as a template?** This file holds only the **generic** rules — the decision loop, file structure, restart procedure. Your own project-specific quick-reference (current skill inventory, codebase shortcuts, team conventions) belongs in **`CLAUDE.local.md`**, which is gitignored. Bootstrap it from `CLAUDE.local.md.example`.

## What this repo is

A personal Claude skill library plus a stdio + HTTP MCP server that exposes those skills to MCP-aware hosts (Claude Desktop, Cowork, Cursor, Claude Code CLI, claude.ai web, etc.).

Generic layout (a fork can grow `skills/` to any size; the structure stays the same):

```
<repo-root>/
├── skills/                     One folder per skill, each with a SKILL.md
│   └── <skill-name>/SKILL.md
├── mcp-server/                 TypeScript stdio + HTTP MCP server
│   ├── src/index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── SKILL_TEMPLATE.md           Starter for every new skill — copy this
├── CLAUDE.md                   ← you're reading it (generic maintenance rules)
├── CLAUDE.local.md             Your own project-specific quick-reference (gitignored)
├── CLAUDE.local.md.example     Template stub for the file above
└── README.md                   Repo overview, install + wire-up
```

Each `skills/<name>/SKILL.md` follows `SKILL_TEMPLATE.md`: YAML frontmatter (`name`, `description`) followed by `Overview`, `When to Use`, `Process / Steps`, `Rules & Constraints`, `Examples`.

## Decision rule: update existing vs. add new

When you observe a recurring behaviour pattern, feedback, or workflow that you want to preserve across sessions:

### 1. First — check whether it belongs in an existing skill

Run through this checklist:

- ☐ Does the new pattern reinforce, refine, or contradict a rule already in one of the existing skills?
- ☐ Does the trigger overlap with an existing skill's `description` field?
- ☐ Would the new content extend an existing skill's `Process / Steps`, `Rules & Constraints`, or `Examples`?

If **yes to any** → **update** the existing skill. Do not create a new one. Spawning parallel skills with overlapping triggers is the same anti-pattern as duplicate tracking docs.

How to update:
1. `Read` the relevant `skills/<name>/SKILL.md`.
2. `Edit` the relevant section (`Process / Steps`, `Rules & Constraints`, or `Examples`). Preserve the section structure.
3. If the trigger words change, update the `description` field in the frontmatter so the skill surfaces for the new phrases too.
4. Restart the MCP server (or have the host re-discover skills) so the change is picked up.

### 2. Only create a new skill when the pattern is genuinely orthogonal

A new skill earns its place only when:

- ☐ The trigger doesn't overlap with any existing skill's description.
- ☐ The content wouldn't naturally live as a section under an existing skill.
- ☐ The pattern is durable — not just a one-off correction (one-off corrections go in `Examples` of an existing skill).

How to add:
1. Pick a `kebab-case` name. The shipped examples use type prefixes (`user-`, `project-`, `feedback-`, `reference-`) — see the header of `SKILL_TEMPLATE.md` for what each means. Reuse the convention or pick your own, but be consistent.
2. Create `skills/<name>/SKILL.md`. Copy `SKILL_TEMPLATE.md` as the starting frame.
3. Fill in the frontmatter (`name` must match the directory name; `description` must include explicit triggers and explicit non-triggers).
4. Each `Process / Steps` step should have **a concrete sub-checklist and an example** wherever it helps.
5. Add cross-references to related skills using their `name:` slug (e.g. `see feedback-additive-changes`).
6. Restart the MCP server.

### 3. When in doubt, ask the user

If you're unsure whether an update or a new skill is right, ask. The cost of asking once is much lower than the cost of duplicate skills drifting apart.

## SKILL.md structure (enforced)

Every skill file MUST follow `SKILL_TEMPLATE.md` — frontmatter + the same fixed sections in the same order. The `description` field is what the MCP server returns from `list_skills`, and what the AI uses to decide relevance. Make the triggers specific — listing actual phrases ("AUDIT.md", "expand-contract", a CLI command the user types) beats abstract descriptions.

## Project-specific quick reference

For the **current set of skills in this repo** and **codebase-specific shortcuts** (file paths, sprint scope, deploy commands, team conventions), see **`CLAUDE.local.md`** (gitignored).

That file is yours to maintain. If it doesn't exist yet:

```bash
cp CLAUDE.local.md.example CLAUDE.local.md
# then fill in your skill inventory + shortcuts
```

## Maintenance workflow at a glance

```
Observe a recurring pattern
        │
        ▼
Does it fit an existing skill?  ──Yes──▶  Edit that skill, update description if triggers change, restart MCP
        │
       No
        ▼
Is it durable + orthogonal?    ──No───▶  Add to Examples of the closest existing skill
        │
       Yes
        ▼
Create skills/<new-name>/SKILL.md following the template, restart MCP
```

Restart procedure for the MCP server:

```bash
cd mcp-server
npm run build
# then restart the host (Claude Desktop, Cowork, etc.) so it re-spawns the server
```

That's the whole loop. Keep skills small, specific, and trigger-rich. The library only stays useful if it doesn't drift into vagueness.
