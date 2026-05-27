---
name: reference-external-providers
description: "Use this skill when designing, modifying, or debugging any code that calls Twelve Data, Alpha Vantage, Finnhub, or FMP.
  Triggers include: 'rate limit', 'credit', 'tier', 'plan', 'quota', mention of any provider by name, batch sync design, news pipeline design, sentiment enrichment, macro pipeline, fundamental sync.
  Also use when an external API call fails or returns unexpected data — tier/quota issues are common root causes.
  Do NOT use for internal-only flows that don't touch external APIs."
---

# Reference — External Providers

## Overview

External data providers used by trader-platform, with rate limits, plan tiers, and known quirks.

## When to Use

- ✅ Any code change that calls an external API.
- ✅ Batch sync chunk sizing or scheduling.
- ✅ Debugging unexpected API responses or quota errors.
- ✅ Designing tier-gated features.
- ❌ Pure UI work or internal database queries.

## Process / Steps

### Step 1 — Identify the provider and plan tier

| Provider      | Free tier limit          | Notes                                                      |
|---------------|--------------------------|------------------------------------------------------------|
| Twelve Data   | 55 credits/min           | 1 credit per symbol on bulk quote; WS streaming **deprecated** in this project. |
| Alpha Vantage | 25 calls/day             | Tight — must use `alpha_budget` guard.                     |
| Finnhub       | Per-endpoint quotas      | Fallback for AV when budget exhausted.                     |
| FMP           | Free / Basic / Starter / Premium | Doesn't block endpoints at network level — see Step 3. |

### Step 2 — Pre-call checklist

Before writing code that calls an external API:

- ☐ Is the call inside the right scheduler? Price → `BatchSyncEngine` loop. News → cron job. Fundamentals → cron job. Macro → cron job.
- ☐ For TD: is chunk size computed from `rate_limiter.available()`?
- ☐ For AV: is `alpha_budget.can_use()` checked first?
- ☐ For FMP: is the method wrapped in `_require_plan("starter")` or `_require_plan("premium")` as needed?
- ☐ For all: is the response cached / persisted before re-call (no double-tap)?

**Example (AV news):**
```python
if not alpha_budget.can_use():
    logger.info("Alpha daily budget exhausted — falling back to Finnhub")
    return await finnhub.fetch_company_news(symbol)
alpha_budget.consume()
return await alpha_vantage.fetch_news_sentiment(symbol)
```

### Step 3 — FMP tier detection (the trap)

FMP doesn't return `403` on insufficient plan — it returns reduced data. Don't probe by endpoint reachability.

**Probe by data range / row count:**

| Probe                                                       | Pass means... |
|-------------------------------------------------------------|---------------|
| `GET /quote/AAPL`                                           | Basic+        |
| `GET /income-statement/AAPL` returns ≥1 row                 | Starter+      |
| `GET /historical-price-full/AAPL?from=2015-01-01` returns rows | Premium+   |

**Example tier-detection probe sequence:**
```python
def detect_fmp_tier() -> str:
    # Basic: single quote works
    if not _probe_quote("AAPL"):
        return "free"
    # Starter: income statement has rows
    if not _probe_income_statement("AAPL"):
        return "basic"
    # Premium: data range exceeds 5 years
    if not _probe_history("AAPL", since="2015-01-02"):
        return "starter"
    return "premium"
```

- ☐ Cache the result for the session — don't re-probe every call.
- ☐ See `feedback-verify-with-real-data` for why this matters.

### Step 4 — Sync scheduling rules

| Data         | Scheduler                | Cadence                                       |
|--------------|--------------------------|-----------------------------------------------|
| Price        | `BatchSyncEngine` loop   | Continuous; chunk size from rate_limiter.     |
| News         | APScheduler cron         | `0 9 * * 1-5` ET (pre-market); optional mid-day `0 9,13 * * 1-5`. |
| Fundamentals | APScheduler cron         | Weekly Mon 06:00 ET.                          |
| Earnings     | APScheduler cron         | Daily 07:00 ET.                               |
| Economic indicators (FMP) | APScheduler cron| Weekly Sunday 02:00 ET (one name per call, looped). |

Cron expressions are **ET** even though the rest of the system uses ICT.

### Step 5 — News DB integration

- ☐ `news` table has `llm_sentiment` column since migration `19052026`.
- ☐ FMP news rows enter with `sentiment_label=NULL` and the existing LLM enrichment job picks them up automatically.
- ☐ Do **not** modify `analysis_engine.py` to handle FMP news — it's transparent.

## Checklist Before Calling Any External API

- ☐ Provider identified and plan tier known (cached probe result).
- ☐ Right scheduler chosen (price loop vs cron).
- ☐ Budget/quota guard applied (`alpha_budget`, rate_limiter.available()).
- ☐ Plan gate applied for FMP (`_require_plan` decorator).
- ☐ Response persisted to DB so REST routers can read from there, not re-call provider.
- ☐ Errors logged via `event_logger` (not the deprecated `log_events` table).

## Rules & Constraints

- ALWAYS: use the `alpha_budget` guard before any AV call.
- ALWAYS: probe data range, not endpoint reachability, when checking FMP tier.
- ALWAYS: chunk TD sync by the current rate-limiter availability.
- ALWAYS: route news through cron, not the price loop.
- ALWAYS: persist responses to DB so REST routers read from DB, not from providers directly (Sprint 1-era cleanup).
- NEVER: assume FMP returns 403 on insufficient plan — it returns reduced data.
- NEVER: poll AV at 300s intervals — 25 calls/day exhausted in <2 minutes.
- NEVER: bypass `_require_plan` gates.
- NEVER: write into the deprecated `log_events` table — use `event_logger`.

## Examples

**Q:** How often should news sync run?
**A:** Cron-based, **not** BatchSyncEngine loop. `0 9 * * 1-5` for daily pre-market refresh; optional `0 9,13 * * 1-5` for mid-day refresh. AV budget guard always applied.

**Q:** Need 15-min intraday bars on the Starter plan — does that work?
**A:** Maybe — FMP doesn't block at the endpoint level, but data may be reduced or empty depending on lookback. Probe with a known recent week and check row count before relying on it.

**Q:** Backend got rate-limited by TD. What now?
**A:** Check `_calc_chunk_size()` — must use `rate_limiter.available()`, not a fixed `min(50, ...)`. Also check whether REST routers still call `provider.get_quote()` directly (Sprint 1-era issue — should now read from `latest_quotes` table).

**Q:** FMP returns data on `/historical-chart/15min` — does that prove Premium?
**A:** No. FMP returns data on every plan; it just reduces content silently. Run a Premium-discriminator probe instead: `historical-price-full/AAPL?from=2015-01-01` returns rows only on Premium.
