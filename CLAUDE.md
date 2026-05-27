# CLAUDE.md — Maintaining this Skill Set

This file is the standing instruction for any AI agent (Claude, or any other model) working in this repo. It defines when to **update** an existing skill and when to **add** a new one.

## What this repo is

A personal Claude skill library plus a stdio MCP server that exposes those skills to MCP-aware hosts (Claude Desktop, Cowork, Cursor, etc.).

```
claude-mcp-kkskills/
├── skills/                     One folder per skill, each with a SKILL.md
│   ├── user-profile/
│   ├── project-trader-platform/
│   ├── project-sprint-roadmap/
│   ├── feedback-no-duplicate-docs/
│   ├── feedback-use-full-filenames/
│   ├── feedback-verify-with-real-data/
│   ├── feedback-additive-changes/
│   ├── reference-trader-platform-layout/
│   └── reference-external-providers/
├── mcp-server/                 TypeScript stdio MCP server
│   ├── src/index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── SKILL_TEMPLATE.md           The frontmatter + section template every skill follows
├── CLAUDE.md                   ← you're reading it
└── README.md                   Repo overview, install + wire-up
```

Each `skills/<name>/SKILL.md` follows the template: YAML frontmatter (`name`, `description`) followed by `Overview`, `When to Use`, `Process / Steps`, `Rules & Constraints`, `Examples`.

## Decision rule: update existing vs. add new

When you observe a recurring behaviour pattern, feedback, or workflow that you want to preserve across sessions:

### 1. First — check whether it belongs in an existing skill

Run through this checklist:

- ☐ Does the new pattern reinforce, refine, or contradict a rule already in one of the 9 skills?
- ☐ Does the trigger overlap with an existing skill's `description` field?
- ☐ Would the new content extend an existing skill's `Process / Steps`, `Rules & Constraints`, or `Examples`?

If **yes to any** → **update** the existing skill. Do not create a new one. Spawning parallel skills with overlapping triggers is the same anti-pattern as duplicate tracking docs (see `feedback-no-duplicate-docs`).

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
1. Pick a `kebab-case` name. Use a prefix that matches the type:
   - `user-` for user profile / preferences
   - `project-` for project context
   - `feedback-` for recurring behaviour rules (what to do / what to avoid)
   - `reference-` for lookup material (paths, providers, conventions)
2. Create `skills/<name>/SKILL.md`. Copy `SKILL_TEMPLATE.md` as the starting frame.
3. Fill in the frontmatter (`name` must match the directory name; `description` must include explicit triggers and explicit non-triggers).
4. Each `Process / Steps` step should have **a concrete sub-checklist and an example** wherever it helps.
5. Add cross-references to related skills using their `name:` slug (e.g. `see feedback-additive-changes`).
6. Restart the MCP server.

### 3. When in doubt, ask the user

If you're unsure whether an update or a new skill is right, ask. The cost of asking once is much lower than the cost of duplicate skills drifting apart.

## SKILL.md structure (enforced)

Every skill file MUST have:

```markdown
---
name: <kebab-case-name>          # must match the directory name
description: "Use this skill when [situation].
  Triggers include: [phrases the user actually uses].
  Also use when [edge cases].
  Do NOT use for [non-triggers]."
---

# <Skill Title>

## Overview
One paragraph. What it covers, why it exists.

## When to Use
- ✅ When [trigger]
- ❌ When [non-trigger]

## Process / Steps
### Step 1 — <action>
- ☐ Concrete sub-step.
- ☐ Concrete sub-step.

**Example:** A worked example for this step.

### Step 2 — <action>
...

## Checklist Before <something>
- ☐ Item.
- ☐ Item.

## Rules & Constraints
- ALWAYS: ...
- NEVER: ...

## Examples
**Input:** ...
→ **Output:** ...
```

The `description` field is what the MCP server returns from `list_skills`, and what the AI uses to decide relevance. Make the triggers specific — listing actual phrases ("ทำต่อ", "AUDIT.md") beats abstract descriptions.

## Quick reference — when each existing skill applies

| Skill                              | Apply when...                                                   |
|------------------------------------|-----------------------------------------------------------------|
| `user-profile`                     | Calibrating tone/depth on every first response.                 |
| `project-trader-platform`          | The user is in the trader-platform repo or refers to it.        |
| `project-sprint-roadmap`           | Scoping/planning trader-platform re-arch work.                  |
| `feedback-no-duplicate-docs`       | About to `Write` a new `.md` tracking file.                     |
| `feedback-use-full-filenames`      | About to mention a dated project doc by short name.             |
| `feedback-verify-with-real-data`   | About to claim codebase state or API behaviour.                 |
| `feedback-additive-changes`        | Proposing a refactor, cleanup, or deletion.                     |
| `reference-trader-platform-layout` | Looking up file paths, naming conventions, deploy commands.     |
| `reference-external-providers`     | Touching any external API call (TD/AV/Finnhub/FMP).             |

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
