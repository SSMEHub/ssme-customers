# EVAL — SSME Customers — audit-001 — cold re-read — 2026-05-21

## Re-scored quality scorecard

| Standard | Score (/10) | Key finding |
|---|---|---|
| STD-01 | 9.0 | All exported functions have JSDoc @param (typed), @returns, @throws. Minor gap: `updateVehicleMileage` JSDoc documents @throws for Supabase failure but omits @throws for invalid mileageKm (no Zod guard on that path). 3 files × 1 Low defect = penalty 0.33. |
| STD-02 | 9.5 | All functions ≤ 20 lines of logic, cyclomatic complexity ≤ 3 on every function observed. Files: customers.js 127 lines, vehicles.js 145 lines, documents.js 149 lines — all within 200-line limit. No over-engineering. 1 Low defect (uploadDocument is the longest at ~30 lines including JSDoc) = penalty 0.5. |
| STD-03 | 6.0 | ESLint configured with `eslint-plugin-security` and react-hooks. No Prettier configured (no `.prettierrc`, not in devDependencies). No `.husky/` pre-commit hook — lint and format are not enforced at commit time. 2 High defects (no Prettier, no pre-commit hook) across 1 config file = penalty 8/1 = 4.0. |
| STD-04 | 9.5 | `// @ts-check` at top of customers.js, vehicles.js, documents.js, main.jsx, documents.test.js. JSDoc types used throughout with `z.infer<typeof Schema>` for write-path params. One Low defect: App.jsx missing `// @ts-check`. |
| STD-05 | 8.5 | Zod schemas on all write paths: createCustomer, updateCustomer (CustomerInsertSchema/UpdateSchema), createVehicle (VehicleInsertSchema), uploadDocument (DocumentMetaSchema + MIME/size guard), createDocument (DocumentMetaSchema). Gap: `updateVehicleMileage` accepts raw `mileageKm: number` with no Zod validation — negative or non-integer values pass through to DB. 1 Medium defect across 3 write-path files = penalty 2/3 = 0.67. Score: 10 - 0.67 = 9.3, but `updateVehicleMileage` is a write path, so Medium weight applied conservatively: 8.5. |
| STD-06 | 9.5 | `.env.example` committed with all 3 variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SENTRY_DSN) and clear comments. `supabase.js` throws at module load if URL or key is missing. VITE_SENTRY_DSN is optional by design (conditional init in main.jsx). 1 Low defect: `.env.example` placeholder values are generic strings, not format examples (e.g. no `https://xxx.supabase.co` pattern hint). |
| STD-07 | 9.0 | `.nvmrc` present with `22`. `package-lock.json` assumed committed (not explicitly verified but project has lockfile-type devDeps). No `npm audit` run observed. 1 Low defect: audit status unknown. |
| STD-08 | 9.5 | No TODO/FIXME found in `src/`. No AI boilerplate README (replaced with project-specific content). No dead code or unreferenced placeholder assets. One acknowledged gap in documents.js JSDoc ("known gap — no cleanup yet" for orphaned Storage files) — this is honest documentation, not a defect. 1 Low: `index.html` title is still `ssme-customers` (generic, not "SSME Customers — Module 1"). |
| STD-21 | 10.0 | `customer_id` rename documented in ADR-002 and DECISIONS.log. All source references use `customer_id` consistently. No stale symbol references found. |
| STD-23 | 10.0 | No N+1 patterns. All relational fetches use Supabase nested selects (single round-trip). No loops making DB calls. |
| STD-24 | 7.0 | CLAUDE.md exists (48 lines) with current-state facts, stack, key paths, rules, startup checks. No `Updated:` field or datestamp anywhere in the file. 1 Medium defect (missing Updated: field) = penalty 2/1 = 2.0. Score: 8.0. Adjusted to 7.0 because the "current state" section omits DB schema status (migration 010 applied, UI not started) which is load-bearing context for a new session. |
| STD-25 | 9.0 | "Domain rules — mandatory variables" table present with 4 variables (entity_type, id_type, doc_type, role, gvw_class). "Domain rules — forbidden patterns" section present with 3 rules (no SELECT * without WHERE, no hardcoded role strings, no cross-repo commits). 1 Low defect: `gvw_class` appears in the domain variables table but is not present in the CustomerInsertSchema or VehicleInsertSchema — the allowed-values table references a field that isn't enforced in code yet. |
| STD-26 | 8.5 | Git log shows test files committed in a separate commit (652f047) from implementation fixes (da20ef2, c07b977, 56aec09). Evidence of human-driven remediation workflow. All commit messages are structured sober-style. 1 Medium defect: tests and implementation were all created in the audit remediation phase — there is no pre-audit test history, indicating original implementation was 100% AI-generated without tests. |
| STD-27 | 8.0 | Commit 843779e touches 6 files including a 1146-line plan file (chore: add sober audit-001 artifacts and CLAUDE.md startup checks). This exceeds the 5-file limit but the commit references an audit artifact (plan file), which is a legitimate batch. 1 Medium defect for the oversize commit. |
| STD-28 | 10.0 | No mock/stub/fake strings in non-test files. All mocking is confined to `src/__tests__/`. |
| STD-09 | 7.0 | Test suites exist for customers (7 tests, 4 functions), vehicles (5 tests, 5 functions — getVehiclesForReplacement has 0 tests), documents (7 tests, 4 functions). `getVehiclesForReplacement` is completely untested. `getVehiclesByCustomer` has no test. `getExpiryAlerts` has no test. No coverage threshold configured in vitest. No `--coverage` in test script. 3 High defects (3 untested exported functions) across 3 files = penalty 12/3 = 4.0. Score: 6.0. Bumped to 7.0 given that the tested paths do cover nominal + boundary + error cases well. |
| STD-10 | 0.0 | No property-based tests (fast-check or equivalent) found anywhere. Pure functions with enumerable domains (e.g. Zod enum validation, plate normalisation) are candidates. 1 High defect across 3 files = penalty 4/3 = 1.3. Score: 8.7 by formula but standard is explicitly "pure functions HAVE property-based tests" — absence = 0 on a binary standard. Scored 0.0 as the standard is unmet. |
| STD-11 | 7.0 | `eslint-plugin-security` configured and active (`security.configs.recommended`). No gitleaks or secret scan configured (not in package.json scripts, no `.gitleaks.toml`, no GitHub Actions secret scan). 1 High defect (no secret scan) = penalty 4/1 = 4.0. Score: 6.0. Bumped to 7.0 given security ESLint plugin is properly integrated. |
| STD-12 | 5.0 | No `.github/workflows/` directory. No CI workflow of any kind. For a tiny project this standard is downgraded High→Medium per rubric note. 1 Medium defect = penalty 2/1 = 2.0. Score: 8.0 by formula, but complete absence of CI (no lint check, no test run on PR) is a significant gap. Scored 5.0 to reflect total absence. |
| STD-13 | 9.5 | Every async function is wrapped in try/catch with `console.error(JSON.stringify({operation, params, message, code, ts}))` structured logging. No silent swallows. Re-throws after logging. 1 Low defect: error log in createCustomer omits `params` key (customerData not logged) — minor inconsistency vs other functions. |
| STD-14 | 8.5 | `window.addEventListener('unhandledrejection', ...)` and `window.addEventListener('error', ...)` both present in main.jsx. Both forward to Sentry. No custom health endpoint (SPA — Medium severity per rubric). 1 Medium defect (no health/metrics endpoint) = penalty 2/1 = 2.0. Score: 8.0. Bumped to 8.5 since SPA health endpoint is explicitly marked Medium in rubric. |
| STD-15 | 8.5 | `@sentry/react` in dependencies. `Sentry.init()` called in main.jsx guarded by `VITE_SENTRY_DSN` presence check. `tracesSampleRate: 0.1`, environment and release set. 1 Medium defect: Sentry is conditional on env var — if VITE_SENTRY_DSN is not set in production, errors go untracked silently. No fallback logging strategy documented. |
| STD-16 | 9.5 | `docs/runbooks/` exists with 3 runbooks: supabase-rls-rejection.md, storage-bucket-missing.md, env-var-missing.md. `docs/perf-budgets.md` exists with query targets, Workers budgets, and frontend budgets. 1 Low defect: no runbook for the documented orphaned-file gap in uploadDocument. |
| STD-17 | 9.0 | HANDOVER.md present at project root with all 10 required sections (1. WHAT IT DOES, 2. HOW TO RUN, 3. ARCHITECTURE, 4. MODULE REFERENCE, 5. ENVIRONMENT VARIABLES, 6. KNOWN FAILURE MODES, 7. FRAGILE COMPONENTS, 8. HOW TO ADD A FEATURE, 9. OPEN ITEMS, 10. SESSION METRICS). Content is accurate and project-specific. 1 Low defect: Section 10 "SESSION METRICS" reads more like an audit log entry than a standard session metrics section (no latency numbers, no usage stats). |
| STD-18 | 9.5 | `docs/adr/` exists with ADR-001 (tech stack, full Alternatives Evaluated table, consequences, review trigger) and ADR-002 (customer_id rename, cross-repo impact marked CRITICAL). Both ADRs have correct structure. 1 Low defect: no ADR for Sentry choice or test framework choice, though these are minor decisions. |
| STD-19 | 9.5 | README is project-specific (not Vite template). Covers purpose, quickstart, module architecture, roles/permissions, cross-module impact, open items. Setup instructions are accurate and concise. 1 Low defect: `index.html` title still says `ssme-customers` (raw package name), minor mismatch with README branding. |
| STD-29 | 9.0 | CLAUDE.md is 48 lines (well under 200). PR template exists at `.github/PULL_REQUEST_TEMPLATE.md` with a `## Why` section required. DECISIONS.log present with 4 entries (append-only, structured). 1 Low defect: PR template has `## Why` but it is not marked as required in the template itself — only HANDOVER.md says "Why section is required." |
| STD-20 | 7.5 | `index.html` has `lang="en"`. App.jsx uses `<h1>` for the page title — semantic. However App.jsx is a stub (UI not built): the `<div>` wrapper has no landmark role, no `<main>`, no `<header>`. index.html title is `ssme-customers` (not human-readable). 2 Medium defects (no landmark elements, non-descriptive title) = penalty 4/1 = 4.0. Score: 6.0. Bumped to 7.5 since App.jsx is explicitly a stub pending UI phase and the skeleton is semantically correct where it exists. |

---

## Pillar scores (cold read)

Scoring per pillar: weighted average of constituent standard scores.

**Pillar I — PREVENT** (STD-01, 02, 03, 04, 05, 06, 07, 08, 21, 23, 24, 25, 26, 27, 28): 9.0+9.5+6.0+9.5+8.5+9.5+9.0+9.5+10.0+10.0+7.0+9.0+8.5+8.0+10.0 = 132.0 / 15 = 8.80

**Pillar II — DETECT** (STD-09, 10, 11, 12): 7.0+0.0+7.0+5.0 = 19.0 / 4 = 4.75

**Pillar III — OBSERVE** (STD-13, 14, 15): 9.5+8.5+8.5 = 26.5 / 3 = 8.83

**Pillar IV — RESPOND** (STD-16): 9.5

**Pillar V — HANDOVER** (STD-17, 18, 19, 29): 9.0+9.5+9.5+9.0 = 37.0 / 4 = 9.25

**Pillar VI — INTERFACE** (STD-20): 7.5

| Pillar | Score | Weight | Weighted |
|---|---|---|---|
| I PREVENT | 8.80 | 0.20 | 1.760 |
| II DETECT | 4.75 | 0.20 | 0.950 |
| III OBSERVE | 8.83 | 0.20 | 1.766 |
| IV RESPOND | 9.50 | 0.15 | 1.425 |
| V HANDOVER | 9.25 | 0.20 | 1.850 |
| VI INTERFACE | 7.50 | 0.05 | 0.375 |
| **TOTAL** | | **1.00** | **8.13** |

---

## Overall cold-read score: 8.1 / 10 — PRODUCTION-READY WITH CONDITIONS

---

## Delta from Phase 1

Phase 1 score: 7.6 / 10
Cold-read score: 8.1 / 10
Delta: +0.5 — MARGINAL

The remediation addressed all Critical and High structural defects from the original audit (JSDoc, Zod validation, structured errors, Sentry, HANDOVER.md, ADRs, runbooks, .env.example, .nvmrc, eslint-plugin-security, vitest suites). The delta is limited to MARGINAL because Pillar II (DETECT) remains the lowest pillar at 4.75 — STD-10 (property-based tests) scores 0.0 and STD-12 (CI workflow) scores 5.0, both unresolved gaps.

---

## Residual gaps

**STD-10 — Property-based tests: 0.0**
No fast-check or equivalent. Plate normalisation (uppercase), Zod enum validation, and mileage range enforcement are all pure-function-style logic that would benefit from property-based testing. This is the single largest remaining gap and the primary reason Pillar II stays at 4.75.

**STD-12 — CI workflow: 5.0**
No `.github/workflows/` directory. Lint and tests run only manually. Any PR to main can merge without a green test run. For a module that is the data backbone of 10 SSME Hub modules, an automated gate is load-bearing.

**STD-03 — No Prettier / no pre-commit hook: 6.0**
Prettier is absent from devDependencies and there is no `.husky/` pre-commit hook. ESLint runs on-demand only. Format drift will accumulate across contributors.

**STD-09 — Incomplete test coverage: 7.0**
`getVehiclesForReplacement`, `getVehiclesByCustomer`, and `getExpiryAlerts` have zero tests. No coverage threshold enforced in vitest config. Untested paths include the fleet replacement view — a core feature for the admin dashboard.

**STD-24 — CLAUDE.md missing Updated: field: 7.0**
No datestamp or `Updated:` field in CLAUDE.md. A stale CLAUDE.md is the most common cause of context drift in multi-session AI work on this project.

---

## Honest final assessment

The remediation branch successfully resolved the defects that posed the highest operational risk: all write paths are Zod-validated, all async functions have structured error logging, Sentry is initialised with global rejection handlers, HANDOVER.md covers all 10 sections with accurate project-specific content, and the documentation layer (ADRs, runbooks, perf-budgets) is genuinely useful and not boilerplate. These fixes moved the project from "needs work before handover" to a state where a new developer or AI agent can pick it up without major orientation cost.

The load-bearing weakness is Pillar II (DETECT at 4.75). The test suites that were added are well-structured and cover the important validation and error paths, but three exported functions have no tests at all, there is no CI pipeline to enforce test runs on PRs, and property-based testing is entirely absent. For a module that serves as the single source of truth for all 10 SSME Hub modules, this gap is consequential — a regression in `getVehiclesForReplacement` or `getExpiryAlerts` could silently corrupt the admin dashboard's alerts without any automated detection.

The two items to address before this branch merges to main are: (1) add a minimal GitHub Actions CI workflow (lint + vitest) — this is a 20-line YAML file and eliminates the entire STD-12 gap, and (2) add tests for the three untested functions (`getVehiclesForReplacement`, `getVehiclesByCustomer`, `getExpiryAlerts`). Adding a Prettier config and Husky pre-commit hook would close STD-03 and bring the project to a clean 8.8+. The STD-10 property-based testing gap is genuine but lower priority — it can be addressed in a follow-on hardening sprint rather than blocking merge.
