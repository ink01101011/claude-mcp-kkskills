---
name: project-trader-platform
description: "Use this skill whenever the user refers to 'the project', 'trader-platform', or any of its modules (AT/auto-trade, portfolio concentration, analysis pipeline, news pipeline, live price, macro pipeline, batch_jobs, batch sync, BatchSyncEngine).
  Triggers include: mentions of FastAPI/React/Postgres/Docker compose in the project's stack context, file paths under `backend/app/`, `frontend/src/`, `batch_jobs/`, `db/migrations/`, or any of its providers (Twelve Data/TD, Alpha Vantage/AV, Finnhub, FMP).
  Also use when the user says 'the docs', 'the audit', 'the roadmap', 'CLAUDE.md' without specifying which project.
  Do NOT use for unrelated projects — those have their own context."
---

# Project — trader-platform

## Overview

The user's main project: an AI-assisted US-market trading dashboard. Combines LLM-generated signals (BUY/WAIT/AVOID with confidence levels) with portfolio management, auto-trade (AT) automation, and live price/news/macro feeds. Built solo, dockerized, currently mid-migration toward Clean Architecture.

**Repo root:** `~/Documents/Claude/Projects/trader-platform/` (adjust to your local path)

## When to Use

- ✅ Any reference to the trader-platform repo, its modules, or its providers.
- ✅ When the user mentions docker-compose services (`db`, `migrator`, `trader-backend`, `frontend`, `batch-jobs`).
- ✅ When a file path matches the project layout.
- ❌ When the user is working in `claude-mcp-kkskills` or another project entirely.

## Process / Steps

### Step 1 — Confirm you're in the right project

- ☐ File path is under `~/Documents/Claude/Projects/trader-platform/` (or wherever it's cloned)? Continue.
- ☐ Otherwise → check which project; this skill may not apply.

### Step 2 — Ground the conversation in current state

Before answering, mentally locate the work in this map:

| Domain                  | Where it lives                                              |
|-------------------------|-------------------------------------------------------------|
| HTTP endpoints          | `backend/app/routers/`                                      |
| Business logic (legacy) | `backend/app/services/` ← target of Clean Arch refactor     |
| ORM models              | `backend/app/models/models.py`                              |
| Pydantic DTOs           | `backend/app/schemas/`                                      |
| Scheduled sync          | `batch_jobs/` (APScheduler container)                       |
| Migrations              | `db/migrations/DDMMYYYY_<description>.sql`                  |
| Frontend pages          | `frontend/src/pages/`                                       |
| Frontend hooks          | `frontend/src/hooks/`                                       |
| AI instructions         | `CLAUDE.md` (root) — authoritative for service layout etc.  |

### Step 3 — Pre-change checklist (when modifying code)

- ☐ `Read CLAUDE.md` first — it's the authoritative spec for service layout, portfolio rules, notification behavior, analysis pipeline, migration and frontend conventions.
- ☐ `grep` for the symbol/file you're about to claim exists — never assume. See `feedback-verify-with-real-data`.
- ☐ Check the current sprint's Out-of-Scope in `27052026_SPRINT_ROADMAP.md` — see `project-sprint-roadmap`.
- ☐ Prefer additive — new endpoint, new column, new directory. See `feedback-additive-changes`.
- ☐ If creating tracking docs, search for existing first. See `feedback-no-duplicate-docs`.
- ☐ If calling an external API, check rate limits and tier. See `reference-external-providers`.

### Step 4 — Deploy checklist (when shipping changes)

- ☐ Run `docker compose up -d --build` — never `restart`. The migrator must run new migrations and services need fresh image layers.
- ☐ Verify migrator: `docker compose logs migrator --tail=20` — last line should show the latest applied migration.
- ☐ Verify backend health: `curl http://localhost:9091/health` → `{"status":"ok"}`.
- ☐ Verify frontend: `curl -s -o /dev/null -w "%{http_code}" http://localhost:9000` → `200`.
- ☐ Verify batch-jobs scheduler started: `docker compose logs batch-jobs --tail=30` — no "scheduler exited" lines.
- ☐ Verify backend startup: `docker compose logs trader-backend --tail=50 | grep -E "ERROR|WARN|started|startup"`.

Note: the sandbox shell cannot reach host `localhost` — provide the commands to the user, they run them on their host machine and paste the output back.

## Key domain facts to keep in mind

- **AT (Auto-Trade)** — Phase A–C — broker accounts, intent queue UI, intent generation, stale expiry, execution, execution log, fill reconciliation, position automation UI, settings UI, kill switch.
- **Portfolio concentration / mark-to-market** — uses `stocks.last_price` which is now persisted in poll mode (closing a gap in concentration calc).
- **Analysis pipeline** — `analysis_engine.py` (~2000 lines), slated for Clean Arch refactor in Sprint 3.
- **News pipeline** — `news` table has `llm_sentiment` column since migration `19052026`. FMP news rows enter with `sentiment_label=NULL` and the existing LLM enrichment job picks them up — no `analysis_engine.py` changes needed.
- **Live price** — `WsPriceManager` (poll mode active; streaming mode dormant since Twelve Data WS deprecation, kept with `DORMANT` comments).
- **Macro pipeline, Backtest, Research Sandbox** — all shipped.
- **News dedup** — 3-layer (a/b/c), uses `url_hash` column from migration `25052026`.

## Rules & Constraints

- ALWAYS: timezone is **ICT everywhere** (UI, DB timestamps) **except** schedule cron expressions, which use **ET (US/Eastern)**.
- ALWAYS: file naming for docs is `DDMMYYYY_NAME.md`, for migrations `DDMMYYYY_description.sql`.
- ALWAYS: focus US market — global indices/news/exchanges are deprioritized but not removed.
- ALWAYS: deploy with `docker compose up -d --build`, **never** `restart`.
- NEVER: assume code state from docs — `grep` first.
- NEVER: spawn a parallel tracking doc.
- NEVER: try to reach host `localhost` from the sandbox shell.

## Examples

**Input:** "เพิ่ม FMP news ให้เข้า pipeline หน่อย"
→ **Output:** Note that `news.llm_sentiment` exists; FMP rows just need to land in `news` with `sentiment_label=NULL` and the existing enrichment will pick them up. No `analysis_engine.py` changes needed. Confirm migration and provider gate before writing.

**Input:** "Backend ขึ้นไม่ได้หลัง deploy"
→ **Output:** Provide the deploy checklist commands (migrator log, backend log, health endpoint). Note that sandbox can't reach host `localhost:9091`, so ask the user to run health checks and paste results.

**Input:** "ทำไม batch_jobs scheduler ไม่รัน"
→ **Output:** Likely a startup error in `batch_jobs/macro_pipeline.py` or similar — that's killed the scheduler before. First command to run: `docker compose logs batch-jobs --tail=30`.
