# NEXT SESSION
Updated: 2026-06-15 (end of session)

## Where we are
Module 1 (Customer & Fleet DB) foundation is **verified, merged to `main`, and pushed to SSMEHub**.
This session took `feat/m1-foundation` from "committed but unverified" → green and integrated.

## This session — DONE
- **Adversarial verification of the foundation build** (migrations 013–015 + `export.js` + list buttons) — all claims CONFIRMED clean (security_invoker views, detection-only dedup, audit triggers, idempotent).
- **Repaired the test suite** — it was 0-runnable (test files imported `../supabase` but the client is at `src/lib/supabase.js`). Fixed import paths + a mock chain + an invalid UUID fixture → **20/20 passing**. No assertions weakened.
- **Cleared 9 ESLint errors** — `Dashboard.jsx` (unused var), `ImportPage.jsx` (regex escapes), `App.jsx` (auth loading moved into async callbacks instead of mirror setState-in-effect), `GlobalSearch.jsx` (derive term-too-short at render + cancel flag for stale results; one line-scoped disable w/ justification). **Lint 0 errors.**
- **Fixed 3 REAL source bugs in `src/lib/db/documents.js`** that the tests caught: `createDocument`/`uploadDocument` did no validation. Added a Zod `doc_type` enum (matches CLAUDE.md domain rules), a file-type allowlist, and a 10 MB size cap — checked **before** touching storage.
- **3 atomic commits → merged `feat/m1-foundation` → `main`** (`--no-ff`, merge `32653a4`, 10 commits) → **re-verified green on main** (20/20 tests, build OK) → **pushed to `origin/main`** (SSMEHub).
- **Caught + fixed a gh account flip** — active account was `GeneralMax618` (casino); switched to `JasonSSKB` before pushing. Commits were already JasonSSKB-attributed.
- **Pricing review (OpenRouter Fusion):** `openrouter/fusion` is **variable-priced** (a panel-of-models router, 128K ctx, `supported_parameters: []` so no tool-calling) — a poor fit as a coding failover. **DeepSeek V4 Pro** ($0.43/$0.87 per 1M, 1M ctx, tool support) stays the recommended failover, ~23× cheaper than Opus 4.8 ($5/$25 per 1M on OpenRouter).

## PENDING — next session
1. **Apply migrations 013–015 to the shared `ssme-hub` DB — ONLY with a backup + Quotation-App coordination.** Additive/non-breaking, but it's the shared prod DB (ADR-002). Migration files are committed but NOT applied — nothing touched the DB this session.
2. **Dedup:** run `scripts/dedup-report.sql` → review `customer_dup_candidates` → human-approved merge (NEVER delete customers) → then enable the forward unique index (currently commented out in 014).
3. **Vehicle backfill** — still BLOCKED on Jason's vehicle Excel (fleet is only 3 rows).
4. **Accounting software API integration — DEFERRED to a future session (Jason's call).** Blockers to resolve first: WHICH software (SQL Account / AutoCount / QuickBooks / Xero — note SQL Account & AutoCount are often desktop with no cloud API); cloud-vs-desktop + API/SDK access + credentials; what data to pull (customers / AR aging / invoices / payments). Scope check: Module 1 is the data vault, and financial/GP data is **admin+finance only** — must gate at the source. ⚠️ `src/lib/export.js` has NO internal role guard, so any financial column passed to it would be emitted ungated — fix when accounting data lands.
5. **Confirm `opus` across a real limit→reset cycle** in daily use.
6. Fold in the council's failover-reliability findings (`/tmp/council-failover-out/`).

## Key info
- Deployed: `https://ssme-customers.soonsengmotorsenterprise.workers.dev`
- Supabase: `gruvcmbsvoauhftfcoio.supabase.co` (ssme-hub) — SHARED with the Quotation App
- Login: `jason@ssmehub.com` / `Ssme2025!`
- Repo: `github.com/SSMEHub/ssme-customers` — `main` is current (foundation merged + pushed). `feat/m1-foundation` still exists.
- **gh account: keep `JasonSSKB` active for truck work** (it had flipped to GeneralMax618). Verify with `gh auth status` before any push.
- Failover: type `ds` (→ DeepSeek V4 Pro) at the limit, `opus` (→ Opus subscription) on reset. The trucks `sk-ant-` API key is OUT OF CREDIT.
