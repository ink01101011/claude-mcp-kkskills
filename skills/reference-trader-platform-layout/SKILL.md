---
name: reference-trader-platform-layout
description: "Use this skill when you need to navigate the trader-platform repo, look up file paths, decide where a new file should live, or check the deploy command.
  Triggers include: 'where does X live', 'which directory for Y', 'how do I deploy', 'docker compose up vs restart', file naming questions, migration naming questions.
  Also use when onboarding a new contributor — the doc reading order matters.
  Do NOT use as a primary skill for tone or planning — this is reference material only."
---

# Reference — Trader-Platform Layout

## Overview

Repo structure, key docs reading order, file naming conventions, and deploy command for `~/Documents/Claude/Projects/trader-platform/`.

## When to Use

- ✅ Look up where a file should live.
- ✅ Verify file naming conventions (docs and migrations).
- ✅ Confirm the deploy command and host network rules.
- ❌ Use as your sole grounding — pair with `project-trader-platform` for the why and `project-sprint-roadmap` for the what.

## Process / Steps

### Step 1 — Locate where a file belongs

| If you're creating...                | Path                                              |
|--------------------------------------|---------------------------------------------------|
| HTTP endpoint                        | `backend/app/routers/<area>.py`                   |
| Business logic (legacy)              | `backend/app/services/<feature>.py`               |
| Pydantic DTO                         | `backend/app/schemas/<area>.py`                   |
| SQLAlchemy ORM model                 | `backend/app/models/models.py`                    |
| Entity (Sprint 1+)                   | `backend/app/entities/<aggregate>.py`             |
| Repository (Sprint 1+)               | `backend/app/repositories/<aggregate>_repo.py`    |
| Use case (Sprint 1+)                 | `backend/app/use_cases/<verb>_<noun>.py`          |
| Unit of Work (Sprint 1+)             | `backend/app/unit_of_work.py`                     |
| Frontend page                        | `frontend/src/pages/<Name>.tsx`                   |
| Frontend hook                        | `frontend/src/hooks/use<Name>.ts`                 |
| SQL migration                        | `db/migrations/DDMMYYYY_<short>.sql`              |
| Architecture / audit / roadmap doc   | `docs/architecture/DDMMYYYY_<NAME>.md`            |
| Working tracking doc                 | `tasks/<existing-file>.md` — Edit, don't create   |
| Scheduled job                        | `batch_jobs/<area>.py` (APScheduler-driven)       |

### Step 2 — Verify naming convention

- ☐ Docs: `^[0-9]{8}_[A-Z_]+\.md$` (e.g. `27052026_ARCHITECTURE_AUDIT.md`).
- ☐ Migrations: `^[0-9]{8}_[a-z0-9_]+\.sql$` (e.g. `19052026_add_news_url_hash.sql`).
- ☐ Date is `DDMMYYYY` (not ISO) — match the existing convention.

**Example:** Adding a column `dismissed_at`. New migration on 28 May 2026 → `db/migrations/28052026_add_signal_dismissed_at.sql`.

### Step 3 — Read CLAUDE.md before changing anything

`CLAUDE.md` at the repo root is authoritative for:
- Service layout
- Portfolio rules
- Notification behavior
- Analysis pipeline
- Migration conventions
- Frontend conventions

Always `Read CLAUDE.md` first if you haven't this session.

### Step 4 — Onboard new contributors

Reading order:
1. `CLAUDE.md`
2. `docs/architecture/27052026_SPRINT_ROADMAP.md`
3. `docs/architecture/27052026_ARCHITECTURE_AUDIT.md`
4. `docs/architecture/27052026_SYSTEM_PROMPT_SCALING.md`
5. `docs/architecture/27052026_BUG.md`
6. `tasks/deferred/README.md`

### Step 5 — Deploy

Always:
```bash
docker compose up -d --build
```

Never `docker compose restart` — the migrator needs to run new SQL and services need fresh image layers.

Verify after deploy:

| Check                  | Command                                                              | Expected             |
|------------------------|----------------------------------------------------------------------|----------------------|
| Migrator log           | `docker compose logs migrator --tail=20`                             | Latest migration applied |
| Backend health         | `curl http://localhost:9091/health`                                  | `{"status":"ok"}`    |
| Frontend reachable     | `curl -s -o /dev/null -w "%{http_code}" http://localhost:9000`       | `200`                |
| Batch-jobs scheduler   | `docker compose logs batch-jobs --tail=30`                           | No "scheduler exited"|
| Backend startup errors | `docker compose logs trader-backend --tail=50 \| grep -E "ERROR\|WARN"` | Clean              |

Note: sandbox shell **cannot reach host `localhost`** — provide these commands to the user, who runs them on the host machine.

## Checklist When Creating a New File

- ☐ Does an equivalent file already exist? (See `feedback-no-duplicate-docs`.)
- ☐ Does the path match the table in Step 1?
- ☐ Does the name match the convention in Step 2?
- ☐ Is the change additive (no destructive edits to existing paths)? (See `feedback-additive-changes`.)
- ☐ Have I `Read CLAUDE.md` if I haven't this session?

## Rules & Constraints

- ALWAYS: docs follow `DDMMYYYY_NAME.md`, migrations `DDMMYYYY_description.sql`.
- ALWAYS: deploy is `docker compose up -d --build`, **not** `restart`.
- ALWAYS: backend health at `http://localhost:9091/health`, frontend at `http://localhost:9000`.
- NEVER: try to reach `localhost:9091` from the sandbox shell — host network isn't accessible.
- NEVER: drop or hard-rename a file under `backend/app/services/` outside Sprint 7+ boy-scout work.

## Examples

**Q:** Where does a new SQL migration go?
**A:** `db/migrations/<DDMMYYYY>_<short_description>.sql`. Example: `28052026_add_signal_dismissed_at.sql`.

**Q:** Where does a new architecture decision doc go?
**A:** `docs/architecture/<DDMMYYYY>_<NAME>.md`.

**Q:** I want to test the backend health endpoint.
**A:** Sandbox cannot reach the host. Provide the user with:
```
curl http://localhost:9091/health
```
He pastes the result back.
