# Sober Audit 002 — feature/module1-ui
Date: 2026-05-23
Score: 5.8/10

## Scope
33 files changed in `feature/module1-ui` vs `main`. Excluded: `.gitignore`, `NEXT-SESSION.md`, `package-lock.json`, `mockup/index.html` (7312-line visual mockup, not production code). Audited 28 source files:

- 22 JS/JSX files (components, pages, DB helpers, schemas, config)
- 1 SQL file (migration 011)
- 1 CSS file (index.css)
- 1 JSON file (package.json)
- 1 plan file (docs/superpowers/plans/2026-05-23-priority-fixes.md)
- 1 docs file (docs/superpowers/plans/...)

JS/JSX files scored against all applicable standards. SQL, JSON, CSS, Markdown files scored only where the standard explicitly covers them (STD-03 naming for SQL, STD-07 for JSON deps, STD-06 for secrets).

## Per-standard findings

| STD | Standard | Score | Findings |
|---|---|---|---|
| STD-01 | Inline Documentation | 3/10 | Only `src/lib/db/customers.js` and `src/lib/db/vehicles.js` have proper JSDoc on exported functions with `@param`, `@returns`, `@throws`. All other files lack documentation: `documents.js`, `dashboard.js`, `import.js`, `storage.js`, all 6 UI components, all 8 page components, both schema files, `App.jsx`, and `main.jsx` (though main.jsx has comments, no JSDoc). Internal helpers (`useDebounce`, `alertLevel`, `groupAlerts`, `docStatus`, `DocCard`, etc.) are undocumented. |
| STD-02 | Code Simplicity (KISS) | 5/10 | 4 files exceed the 200-line limit: `ImportPage.jsx` (353), `DocumentCabinet.jsx` (258), `VehicleForm.jsx` (226), `vehicles.js` (237). Individual functions are generally well-sized (most <30 lines). No over-engineered patterns (no factories/strategies). Single-responsibility is good. Cyclomatic complexity is reasonable. The oversized files should be decomposed. |
| STD-03 | Code Style | 5/10 | ESLint configured with `eslint.config.js` including `eslint-plugin-security` (good). **No Prettier config** (`.prettierrc` missing). No pre-commit hooks (no `.husky/`). File naming is kebab-case (good). Variables are camelCase (good). Constants are inconsistent — some use `UPPER_SNAKE_CASE` (`DOC_TYPE_LABELS`, `VEHICLE_STATUS`, `ENTITY_TYPES`), others use camelCase (`inputCls`, `selectCls`, `textareaCls`). |
| STD-04 | Type Safety | 2/10 | Only 4 files have `// @ts-check`: `main.jsx` and the 3 test files. No TypeScript. JSDoc types on `customers.js` and `vehicles.js` provide partial coverage but are absent from all component/page files. Many untyped function boundaries (URL params, search params, form data). |
| STD-05 | Input Validation at Boundaries | 8/10 | Zod schemas for customer and vehicle models. `zodResolver` in both `CustomerForm` and `VehicleForm`. DB write paths validate with `.parse()` (`createCustomer`, `updateCustomer`, `createVehicle`, `updateVehicle`). Env vars validated at startup in `supabase.js`. File upload validates type (PDF/JPEG/PNG) and size (10 MB max) in `documents.js`. Gaps: URL params (`useParams()` result) and search params (`searchParams.get()`) are used directly without schema validation. |
| STD-06 | Secrets & Config Hygiene | 7/10 | `.env.example` committed with 3 documented vars (Supabase URL, anon key, Sentry DSN). Supabase env vars validated at startup (throws if missing). Sentry DSN validated before init. No hardcoded secrets found in source. `.gitignore` has `*.local` (covers `.env.local`) but `.env` is not explicitly listed. |
| STD-07 | Dependency Hygiene | 7/10 | Lockfile (`package-lock.json`) committed. `.nvmrc` pins Node 22. Dependencies match imports (no phantom deps detected). No orphan deps identified. `npm audit` status unknown. |
| STD-08 | AI-Output Hygiene | 5/10 | One TODO without owner/date: `AppShell.jsx:6` (`// TODO: replace hardcoded role with supabase auth context`). Magical constant `86400000` (ms per day) appears in 3 files without inline comment (`VehicleList.jsx:20`, `DocumentCabinet.jsx:25,33`). Several exported functions in `customers.js` and `vehicles.js` appear unused by imported callers (e.g., `deleteCustomer`, `searchCustomers`, `getVehicleByPlate`, `deleteVehicle`, `updateVehicleMileage` — may be dead code). No phantom imports. No test theater (mocks are appropriate for DB boundary). |
| STD-09 | Unit Tests + Branch Coverage | 5/10 | 3 test files exist (`customers.test.js`, `documents.test.js`, `vehicles.test.js`) using vitest. Tests cover nominal CRUD paths. Boundary and failure paths partially covered. Mock-heavy pattern (entire supabase module mocked). No vitest config or coverage configuration. No `__tests__` directory for UI components. Not all exported DB functions have tests. |
| STD-10 | Property-Based Tests | 0/10 | No property-based tests anywhere. `fast-check` not in dependencies. Schema validation logic (Zod schemas), date formatting helpers, and business logic (plate normalisation, alert level calculation) are pure functions well-suited for PBT. |
| STD-11 | Static Analysis | 4/10 | ESLint with `eslint-plugin-security` is configured (good). No `semgrep` configuration. No `gitleaks` configured for secret scanning. No additional static analysis tooling beyond ESLint. |
| STD-12 | CI Baseline | 0/10 | No CI workflow. No `.github/workflows/` directory. No automated pipeline for lint, type-check, tests, or static analysis. |
| STD-13 | Structured Error Handling & Logging | 5/10 | DB layer (`customers.js`, `vehicles.js`) uses structured JSON `console.error` with operation name, params, message, code, and timestamp. Good. `documents.js` has partial structured handling with a rollback in `uploadDocument`. **Critical gaps**: `GlobalSearch.jsx:39` has `.catch(() => {})` (silent swallow). `DocumentCabinet.jsx:53` uses `alert()` for user-facing errors. `storage.js` has no try/catch on storage operations. No Winston/Pino logging library. |
| STD-14 | Observability + Anomaly Alerts | 4/10 | SPA — no health endpoint applicable. Sentry covers error monitoring (see STD-15). No custom metrics (request count, error rate, latency). No anomaly alerting. |
| STD-15 | Remote Error Tracking | 8/10 | Sentry initialized in `main.jsx` with DSN from env var (skipped if absent). Captures unhandled exceptions (`window.onerror`). Captures unhandled promise rejections. Environment and release configured. Breadcrumbs not explicitly configured beyond defaults. |
| STD-16 | Operational Playbook | 8/10 | `docs/runbooks/` has 3 runbooks (env-var-missing, storage-bucket-missing, supabase-rls-rejection). `docs/perf-budgets.md` documents Supabase query targets. Runbooks cover current known failure modes. Missing: Cloudflare Workers deployment failure runbook. |
| STD-17 | HANDOVER.md | 8/10 | `HANDOVER.md` exists at root, well-structured with 10 sections. Current (dated 2026-05-21). Setup instructions match actual repo. No Obsidian mirror (minor). |
| STD-18 | Architectural Decision Records | 8/10 | `docs/adr/` has 2 ADRs (ADR-001 tech stack, ADR-002 customer-id-rename). Both well-formatted with context, decision, alternatives, consequences. No ADR for migration 011 schema additions. No postmortem ADRs. |
| STD-19 | Documentation Freshness | 7/10 | HANDOVER.md current (2 days old). ADRs accurate. README not audited (not in this branch change set). JSDoc has minor drift (missing docs on new functions). |
| STD-20 | Accessibility (WCAG 2.1 AA) | 5/10 | Form labels present in `CustomerForm.jsx` (`<label>` with htmlFor). Mockup has `lang="en"` on `<html>`. No `<img>` tags (good — no alt text issues). No a11y tooling configured (no axe-core, no Lighthouse CI). Keyboard navigation not verified. No `aria-*` attributes found in production components. |
| STD-21 | Refactor Exit Rule | 10/10 | No stale references. No refactor-induced breakage detected. Symbol rename (customers.id -> customer_id in migration) is clean throughout. |
| STD-23 | Performance Hotspots | 8/10 | No N+1 patterns. All DB queries are in standalone functions or React Query hooks. Dashboard aggregates 3 parallel queries with `Promise.all`. Import processes rows in-memory then batch-inserts. Minor: `GlobalSearch` fires per-keystroke queries (mitigated by 300ms debounce). |
| STD-24 | Session-State Hygiene | 3/10 | No `AGENTS.md` at project root. Partially compensated by checklist in `CLAUDE.md` (Session Startup Checks) and `NEXT-SESSION.md`. |
| STD-25 | Domain Guardrails | 10/10 | Excellent "Domain rules — mandatory variables" section in CLAUDE.md with 6 domain variables, allowed values, and business reasons. "Domain rules — forbidden patterns" section with 5 clear rules. Both comprehensively documented. |
| STD-26 | Touch Rule + Test Separation | 5/10 | Commit history shows 23 commits on this branch. Tests and implementation are in separate files but same branch. Hard to verify AI-human separation without per-commit author analysis. No evidence of "blind prompt gambling" (code shows human-aware domain knowledge). |
| STD-27 | Hard Scope Limits | 7/10 | Most commits change 1-3 files (well-scoped). Outlier: `f7e11f6` adds 7312-line mockup (acceptable — it's an HTML mockup, not production code). No Big Bang production commits. |
| STD-28 | Contract Freezing | 8/10 | Schema files (`src/schemas/*`, `supabase/migrations/*`) are stable. No `TODO_PROD` patterns. No mock/fake/stub strings in production code. |
| STD-29 | Rule File Discipline | 7/10 | CLAUDE.md is 49 lines (well under 200). No router pattern markers (`<!-- @loads-from: -->`), but project is small enough that a single CLAUDE.md suffices. PR template has required "Why" section. `DECISIONS.log` exists and is current (last entry 2026-05-21). |

## Per-file breakdown

| File | Lines | Score impact | Top issues |
|---|---|---|---|
| `src/lib/db/customers.js` | 180 | Good | No `@ts-check`. 3 exported functions potentially unused. |
| `src/lib/db/vehicles.js` | 237 | Over limit | Exceeds 200-line limit. No `@ts-check`. 4 functions potentially unused. |
| `src/lib/db/documents.js` | 78 | Moderate | No JSDoc on any function. Mixed error handling (structured + unstructured). |
| `src/lib/db/dashboard.js` | 49 | Moderate | No JSDoc on any function. |
| `src/lib/db/import.js` | 31 | Moderate | No JSDoc on any function. |
| `src/lib/storage.js` | 45 | Moderate | No JSDoc. No try/catch on storage operations. |
| `src/pages/import/ImportPage.jsx` | 353 | Over limit | Largest file. No JSDoc. No `@ts-check`. |
| `src/pages/vehicles/DocumentCabinet.jsx` | 258 | Over limit | Exceeds 200-line limit. Uses `alert()`. No JSDoc. |
| `src/pages/vehicles/VehicleForm.jsx` | 226 | Over limit | Exceeds 200-line limit. No JSDoc. |
| `src/pages/Dashboard.jsx` | 165 | Moderate | No JSDoc. Magical constant. |
| `src/pages/customers/CustomerDetail.jsx` | 182 | Moderate | No JSDoc. |
| `src/pages/customers/CustomerForm.jsx` | 175 | Good | Zod validation. Form labels present. No JSDoc. |
| `src/pages/customers/CustomerList.jsx` | 132 | Good | Clean structure. No JSDoc. No `@ts-check`. |
| `src/pages/vehicles/VehicleList.jsx` | 172 | Moderate | Magical constant. No JSDoc. |
| `src/pages/vehicles/VehicleDetail.jsx` | 114 | Good | Clean structure. No JSDoc. |
| `src/components/layout/GlobalSearch.jsx` | 119 | Poor | Silent error swallow (`.catch(() => {})`). No JSDoc. |
| `src/components/layout/AppShell.jsx` | 22 | Moderate | TODO without owner/date. |
| `src/components/layout/Sidebar.jsx` | 42 | Good | Clean. No JSDoc. |
| `src/components/ui/StatusBadge.jsx` | 43 | Good | Clean. No JSDoc. |
| `src/components/ui/EmptyState.jsx` | 13 | Good | Minimal. No JSDoc. |
| `src/components/ui/PageHeader.jsx` | 23 | Good | Minimal. No JSDoc. |
| `src/App.jsx` | 30 | Good | Clean. No JSDoc. |
| `src/main.jsx` | 44 | Good | Has `@ts-check`. Sentry init. Comments present. |
| `src/schemas/customer.js` | 42 | Good | Zod schema with enum validation. No JSDoc. |
| `src/schemas/vehicle.js` | 76 | Good | Comprehensive Zod schema. No JSDoc. |
| `supabase/migrations/011_contacts_credithold_hardcopy.sql` | 164 | Good | Clean SQL. Proper constraints. N/A for most standards. |

## Onboarding readiness

| Criterion | Verdict | Blocking standard(s) |
|---|---|---|
| 1. Developer onboards within 20 min | PARTIAL | STD-03 (no Prettier config), STD-12 (no CI), STD-24 (no AGENTS.md) |
| 2. Defect isolated without escalation | PARTIAL | STD-13 (silent swallows, alert()), STD-14 (no metrics/health) |
| 3. Feature added without regression | PARTIAL | STD-09 (incomplete test coverage), STD-10 (no PBT), STD-12 (no CI) |
| 4. Crash debuggable from logs alone | PARTIAL | STD-13 (inconsistent error handling), STD-14 (no metrics) |

## Previous audit comparison

Audit 001 score: 7.6/10 (2026-05-21, backend-only codebase, 8 source files)
Audit 002 score: 5.8/10 (2026-05-23, full frontend+backend branch, 28 source files)
Delta: -1.8 points

**Note:** Scores are NOT directly comparable. Audit 001 evaluated a compact backend-only codebase (3 DB helpers, supabase client, main.jsx — 8 files total) against 15 standards. Audit 002 evaluates 28 source files including 14 new UI component/page files against all 28 standards. The score drop reflects:

1. **New UI code pulls down the average:** The 14 new component/page files uniformly lack JSDoc (STD-01 drops 6.0 → 3.0), `@ts-check` (STD-04 drops 8.7 → 2.0), and unit tests (STD-09 drops 6.0 → 5.0). These were not present in audit-001.
2. **KISS regression from file growth:** 4 files exceed 200-line limit (STD-02 drops 10.0 → 5.0). The backend-only audit had no files >200 lines.
3. **PBT removed from schedule:** `fast-check` was removed from dependencies. The earlier codebase had it installed (STD-10 drops 9.3 → 0.0).
4. **CI config removed:** `.github/workflows/` existed in the prior codebase state (STD-12 drops 8.0 → 0.0).

**Standards improved since audit-001:**

| Standard | Audit 001 | Audit 002 | Delta | Reason |
|---|---|---|---|---|
| STD-05 | 3.3 | 8.0 | +4.7 | Zod schemas added. Env validation confirmed. File upload validation. |
| STD-15 | 6.0 | 8.0 | +2.0 | Sentry initialized with DSN, unhandled exception/rejection capture. |
| STD-16 | 0.0 | 8.0 | +8.0 | Runbooks and perf budgets added. |
| STD-17 | 0.0 | 8.0 | +8.0 | HANDOVER.md created with full 10-section format. |
| STD-18 | 0.0 | 8.0 | +8.0 | ADR-001 and ADR-002 created. |
| STD-25 | 0.0 | 10.0 | +10.0 | Domain rules section added to CLAUDE.md. |
| STD-29 | 0.0 | 7.0 | +7.0 | PR template with "Why" section. DECISIONS.log created. |

**Standards regressed since audit-001:**

| Standard | Audit 001 | Audit 002 | Delta | Reason |
|---|---|---|---|---|
| STD-01 | 6.0 | 3.0 | -3.0 | New UI code without JSDoc. Backend-only had better doc ratio. |
| STD-02 | 10.0 | 5.0 | -5.0 | 4 new files exceed 200-line limit. |
| STD-03 | 9.8 | 5.0 | -4.8 | Prettier config not added. Pre-commit hooks not installed. |
| STD-04 | 8.7 | 2.0 | -6.7 | @ts-check not added to new files. Backend-only JSDoc was adequate. |
| STD-08 | 9.6 | 5.0 | -4.6 | TODO rot accumulating. Magical constants. Unused exports. |
| STD-10 | 9.3 | 0.0 | -9.3 | fast-check removed from dependencies. |
| STD-12 | 8.0 | 0.0 | -8.0 | CI workflow removed/not migrated to new branch. |

## Top 5 priorities to reach 7.0+

1. **STD-04 Type Safety (2.0):** Add `// @ts-check` to all JS/JSX files. Add JSDoc return types to exported functions in newly added files. The back-end layer already has good JSDoc — extend the pattern.
2. **STD-10 Property-Based Tests (0.0):** Re-add `fast-check` and write PBT for pure functions: Zod schema parsing, plate normalisation, alert level calculation, date arithmetic.
3. **STD-12 CI Baseline (0.0):** Create `.github/workflows/ci.yml` running lint, type-check, test, and coverage on every PR.
4. **STD-01 Inline Documentation (3.0):** Add JSDoc to all exported functions in `documents.js`, `dashboard.js`, `import.js`, `storage.js`, and the 7 page components. Focus on public API functions with `@param`, `@returns`, `@throws`.
5. **STD-02 Code Simplicity (5.0):** Decompose the 4 oversized files: split `ImportPage.jsx` into sub-components (file upload, row review, batch promote), split `DocumentCabinet.jsx` DocCard into its own file.

## Defect log

**Total defects found: 18 (0 Critical, 8 High, 7 Medium, 3 Low)**

### High (8)

1. **Silent error swallow** — `GlobalSearch.jsx:39` `.catch(() => {})` discards all fetch errors silently.
2. **No unit tests for 5 exported functions** — `searchCustomers`, `getCustomersFiltered`, `getVehicleByPlate`, `updateVehicleMileage`, `getReplacementTargets` have no tests.
3. **No CI pipeline** — Missing `.github/workflows/` means no automated quality gate.
4. **No `@ts-check` on 14 of 18 source files** — Large type-safety gap for the UI layer.
5. **Missing Prettier config** — No `.prettierrc` means no automated formatting standard.
6. **No property-based tests** — `fast-check` removed; critical domain functions (schema parsing, date math) untested on edge inputs.
7. **Unused exports accumulating** — `src/lib/db/customers.js` exports `deleteCustomer`, `getCustomerCount`, `searchCustomers`, `getCustomersFiltered` not imported by any page; `src/lib/db/vehicles.js` exports `getVehicleByPlate`, `updateVehicleMileage`, `getVehicleById`, `updateVehicle`, `deleteVehicle`, `getReplacementTargets` with no apparent callers in this branch.
8. **`alert()` in production code** — `DocumentCabinet.jsx:53` uses `alert()` for user-facing errors instead of a UI toast/notification.

### Medium (7)

1. **TODO without owner/date** — `AppShell.jsx:6` hardcoded role TODO.
2. **Magical constant repeated** — `86400000` (ms/day) used in 3 files without inline comment.
3. **Files exceed 200-line limit** — 4 files over limit (ImportPage 353, DocumentCabinet 258, VehicleForm 226, vehicles.js 237).
4. **No inline JSDoc on 20 of 22 JS/JSX files** — Only customers.js and vehicles.js have proper documentation.
5. **Inconsistent error handling** — DB layer uses structured JSON; components use mixed approaches (alert, raw throws, empty catch).
6. **No vitest coverage configuration** — Coverage thresholds not defined.
7. **`.env` not in `.gitignore`** — Only `*.local` is listed; `.env` could be committed accidentally.

### Low (3)

1. **Constant naming inconsistency** — Some constants use camelCase instead of UPPER_SNAKE_CASE.
2. **No Obsidian mirror for HANDOVER.md** — Minor documentation gap.
3. **No pre-commit hooks** — Formatting and lint not enforced at commit time.
