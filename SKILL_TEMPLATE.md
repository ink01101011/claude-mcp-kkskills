<!--
================================================================================
  SKILL_TEMPLATE.md — the starter for every skill in this library.

  How to use this template:
    1. Decide the skill name in kebab-case (matches the directory).
    2. Run:  cp SKILL_TEMPLATE.md skills/<your-skill-name>/SKILL.md
    3. Replace every <placeholder> below and delete sections you don't need.
    4. Rebuild + restart the MCP server (see CLAUDE.md → restart procedure).

  Naming convention (used by the shipped example skills — reuse or replace):
    user-*       Personal profile / preferences. Calibrates tone, depth, register.
    project-*    Per-project context. Codebase, sprint, goals.
    feedback-*   Recurring behaviour rules. What to do / what to avoid.
    reference-*  Lookup material. Paths, APIs, conventions, providers.

  Required structure (the MCP server + the AI both rely on this shape):
    - YAML frontmatter with `name` and `description`
    - `# Skill Title`
    - `## Overview`
    - `## When to Use`
    - `## Process / Steps`
    - `## Rules & Constraints`
    - `## Examples`

  The `description` field is what `list_skills` returns and what the AI uses
  to decide relevance. Put REAL trigger phrases there ("AUDIT.md", a CLI
  command, an error message) — not abstract descriptions.
================================================================================
-->
---
name: skill-name-in-kebab-case
description: "Use this skill when [situation].
  Triggers include: [phrases the user actually uses, including specific filenames/terms].
  Also use when [edge cases].
  Do NOT use for [non-triggers — be explicit so the skill doesn't over-fire]."
---

# Skill Title

## Overview

One paragraph. What this skill covers, why it exists, who or what it applies to.

## When to Use

- ✅ Use when [concrete trigger].
- ✅ Use when [another concrete trigger].
- ❌ Do not use when [non-trigger that might falsely match].

## Process / Steps

### Step 1 — <action verb + object>

- ☐ Concrete sub-step.
- ☐ Concrete sub-step.

**Example:** A worked example showing the step in action.

### Step 2 — <action verb + object>

- ☐ Concrete sub-step.

**Example:** ...

### Step 3 — <action verb + object>

- ☐ Concrete sub-step.

## Checklist Before <something>

- ☐ Verification item.
- ☐ Verification item.
- ☐ Verification item.

## Rules & Constraints

- ALWAYS: <invariant the skill enforces>.
- ALWAYS: <invariant the skill enforces>.
- NEVER: <hard prohibition>.
- NEVER: <hard prohibition>.

## Examples

**Input:** "<phrase the user might say>"
→ **Output:** What the assistant should do, concretely.

**Wrong:** What the assistant might be tempted to do.
**Right:** What the assistant should do instead, with reasoning.
