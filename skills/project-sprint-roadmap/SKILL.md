---
name: project-sprint-roadmap
description: "Use this skill whenever the trader-platform re-architecture comes up — Clean Architecture migration, 4-stage LLM pipeline, sprint planning, sprint scope, or any reference to Sprint 0–7+.
  Triggers include: mentions of 'sprint', 'roadmap', 'AUDIT', 'SCALING', 'BUG' tracks, 'Clean Arch', 'UnitOfWork'/'UoW', 'import-linter', 'entities/repositories/use_cases', 'chained pipeline', 'dual-write', 'strangler fig', 'aggregate' (Signal/Position/Analysis), 'PoC'.
  Also use when scoping new work — to decide which sprint it belongs in and whether it conflicts with existing scope.
  Do NOT use for unrelated codebases — this is trader-platform-specific."
---

# Project — Sprint Roadmap

## Overview

The trader-platform re-architecture runs **three tracks in parallel**, not sequentially. Coordinated through `27052026_SPRINT_ROADMAP.md` — the single source of truth.

**Three tracks:**
1. 🐛 **BUG** (`27052026_BUG.md`) — stabilization, handed off to a different dev
2. 🏗️ **AUDIT** (`27052026_ARCHITECTURE_AUDIT.md`) — Clean Architecture migration: `entities/` + `repositories/` + `use_cases/` + `UnitOfWork`, with `import-linter` as the boundary fence
3. 🧠 **SCALING** (`27052026_SYSTEM_PROMPT_SCALING.md`) — 4-stage chained LLM pipeline with dual-write rollout

## When to Use

- ✅ Any scope/planning conversation for trader-platform.
- ✅ When deciding whether a piece of work is Sprint N or out-of-scope.
- ✅ When pattern questions come up (entity? repo? UoW? import-linter contract?).
- ❌ For ad-hoc bug fixes that have nothing to do with arch — those go through the BUG track or boy-scout rule.

## Process / Steps

### Step 1 — Look up the current sprint

- ☐ Open `docs/architecture/27052026_SPRINT_ROADMAP.md` §2.
- ☐ Identify which sprint is active and read its **Goal**, **Tasks**, **Acceptance**, **Out-of-Scope**.

**Example:** The user says "อยากเพิ่มเรื่อง X". You open §2, see the active sprint is Sprint 1 (`Signal` PoC). X is `refactor analysis_engine.py` — that's listed as Out-of-Scope for Sprint 1 (it's Sprint 3 work).

### Step 2 — Place the work in a sprint

Use this lookup table:

| If the work is...                                        | Sprint        |
|----------------------------------------------------------|---------------|
| Fix a critical bug from the bug list                     | 0 (BUG track) |
| New `entities/`, `repositories/`, `use_cases/`, UoW PoC  | 1             |
| `Position` aggregate, capability gating                  | 2             |
| `Analysis` aggregate, chained 4-stage pipeline           | 3             |
| Dual-write rollout, disagreement reporting               | 4             |
| Promote new pipeline / hold / revert decision            | 5             |
| `batch_jobs/` HTTP or gRPC split                         | 6             |
| Migrate a `services/` file when feature work touches it  | 7+ (boy-scout)|

**Example:** "Move `portfolio_engine` math out into its own module" → Sprint 2 (`Position` aggregate extraction).

### Step 3 — Verify it doesn't violate Sprint 1's additive rule

- ☐ New endpoint at a new path? Good.
- ☐ Adds a column via `ADD COLUMN ... NULL`? Good.
- ☐ Touches an existing endpoint's response shape? **Stop** — re-scope as additive.
- ☐ Refactors `analysis_engine.py`? **Stop** — that's Sprint 3.
- ☐ Splits `batch_jobs/`? **Stop** — that's Sprint 6.
- ☐ Cleans up "while I'm here"? **Stop** — listed as an anti-pattern in §5.

### Step 4 — Confirm dependency gates

- ☐ Sprint 3 needs Sprint 2 done (capability gating must exist).
- ☐ Sprint 4 needs Sprint 3 done (chained pipeline must exist).
- ☐ Sprint 5 needs Sprint 4 + 14 trading days of dual-write data.
- ☐ Sprint 6 needs Sprint 3 use cases (so HTTP split has a clean target).

## Sprint Reference Table

| Sprint | Name                         | Focus                                                                  |
|--------|------------------------------|------------------------------------------------------------------------|
| 0      | Bug Stabilization            | BUG track. 3/7 critical done.                                          |
| 1      | Foundation Wedge             | PoC with `Signal` aggregate, full-tree `import-linter` day 1.          |
| 2      | `Position` + capability gate | AUDIT + SCALING contracts.                                             |
| 3      | **The Big Wedge**            | `Analysis` + chained pipeline. AUDIT and SCALING overlap *here*.       |
| 4      | Dual-write rollout           | SCALING.                                                               |
| 5      | Promotion Gate               | SCALING decision (wait for 14 trading days).                           |
| 6      | `batch_jobs/` HTTP split     | AUDIT.                                                                 |
| 7+     | Boy-scout strangle           | AUDIT, no end date — migrate `services/` only when feature work hits.  |

**Definition of Sprint 1 success:** "Sprint 2 dev opens the PR, reads CLAUDE.md + Signal example, starts `Position` aggregate without asking architectural questions, and `import-linter` shouts if they get the layer wrong."

## Rules & Constraints

- ALWAYS: when work is proposed, check it against the current sprint's Out-of-Scope list.
- ALWAYS: Sprint 1 changes must be additive only.
- ALWAYS: `import-linter` is full-tree from day 1 — legacy code can't add new violations, new code must comply from line 1.
- NEVER: refactor `analysis_engine.py` before Sprint 3.
- NEVER: split `batch_jobs/` before Sprint 6.
- NEVER: do "while I'm here" cleanup outside sprint scope.

## Examples

**Input:** "อยาก refactor analysis_engine.py ตอนนี้เลย ได้ไหม"
→ **Output:** Pushback — that's Sprint 3. The pattern needs to be proven on Sprint 1 (`Signal`) and Sprint 2 (`Position`) first. Suggest a Sprint 1 PoC contribution instead.

**Input:** "Sprint นี้ใส่ feature X ได้ไหม"
→ **Output:** Cross-reference the current sprint's Goal and Out-of-Scope sections. If X isn't in scope, suggest deferring or routing through the BUG track if it's a real defect.

**Input:** "Clean Arch มี contract อะไรบ้าง"
→ **Output:** 5 `import-linter` contracts — `entities-pure`, `repos-isolate-orm`, `use-cases-pure`, `routers-via-use-cases`, `no-backwards-strangle`. Full config in `27052026_ARCHITECTURE_AUDIT.md` §8.5.
