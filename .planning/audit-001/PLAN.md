# PLAN — SSME Customers — audit-001 — 2026-05-21

Scope: Critical (0) + High (21) defects only.
Medium + Low → BACKLOG.md.

Wave structure (parallel subagents):
- Wave 1: Agents A, B, C, E run in parallel (no file overlap).
- Wave 2: Agent D (tests) runs after Wave 1 completes (needs Zod schemas from Agent A).

---

## AGENT A — lib-layer (customers.js, vehicles.js, documents.js)

Defects: DEFECT-001, 002, 003, 005, 006, 007, 008, 009, 010, 021, 029

### FILE: src/lib/db/customers.js
- Current state:   4 exported async functions. No JSDoc, no @ts-check, no input validation. Errors rethrown raw.
- Defects:         DEFECT-001 (STD-01), DEFECT-005 (STD-04), DEFECT-006 (STD-05), DEFECT-007 (STD-05), DEFECT-021 (STD-13), DEFECT-029 (STD-26)
- Changes:
  1. Add `// @ts-check` at line 1.
  2. Define a Zod schema `CustomerInsertSchema` for createCustomer and `CustomerUpdateSchema` (partial, allowlisted fields) for updateCustomer.
  3. Add JSDoc blocks (@param with types, @returns, @throws) to all 4 functions.
  4. Wrap each function body in try/catch. On catch: `console.error(JSON.stringify({ operation, params: sanitised, message: error.message, code: error.code, ts: new Date().toISOString() }))` then re-throw.
  5. Call schema.parse() in createCustomer and CustomerUpdateSchema.partial().parse() in updateCustomer before the supabase call.
- Regression risk: Low — validation adds a new throw path; callers that passed valid data are unaffected.
- Mitigation:      Tests (Agent D) cover nominal + validation-error paths.
- Standards met:   STD-01, STD-04, STD-05, STD-13, STD-26
- Dependency:      Zod must be installed before this commit (pre-step).

### FILE: src/lib/db/vehicles.js
- Current state:   5 exported async functions. No JSDoc, no @ts-check, no input validation. Errors rethrown raw.
- Defects:         DEFECT-002 (STD-01), DEFECT-005 (STD-04), DEFECT-008 (STD-05), DEFECT-021 (STD-13), DEFECT-029 (STD-26)
- Changes:
  1. Add `// @ts-check` at line 1.
  2. Define `VehicleInsertSchema` for createVehicle (required: plate_number, customer_id; normalisation happens after parse).
  3. Add JSDoc to all 5 functions.
  4. Wrap each function body in try/catch with structured console.error.
  5. Call VehicleInsertSchema.parse() in createVehicle before insert.
- Regression risk: Low
- Mitigation:      Tests (Agent D) cover plate normalisation path.
- Standards met:   STD-01, STD-04, STD-05, STD-13, STD-26
- Dependency:      Zod pre-step.

### FILE: src/lib/db/documents.js
- Current state:   4 exported async functions. uploadDocument has multi-step Storage + DB logic, no validation, no file type/size check.
- Defects:         DEFECT-003 (STD-01), DEFECT-005 (STD-04), DEFECT-009 (STD-05), DEFECT-010 (STD-05), DEFECT-021 (STD-13), DEFECT-029 (STD-26)
- Changes:
  1. Add `// @ts-check` at line 1.
  2. Define `DocumentMetaSchema` (doc_type enum from DB CHECK, expiry_date optional date string).
  3. Define `ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']` and `MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024`.
  4. In uploadDocument: validate file.type and file.size before Storage upload; validate docMeta with DocumentMetaSchema before DB insert.
  5. In createDocument: validate docData with DocumentMetaSchema.
  6. Add JSDoc to all 4 functions (especially uploadDocument — document the multi-step failure model).
  7. Wrap each function in try/catch with structured console.error.
- Regression risk: Medium — file type/size guard is new behaviour for uploadDocument.
- Mitigation:      File type/size constants are explicit; test covers the rejection path.
- Standards met:   STD-01, STD-04, STD-05, STD-13, STD-26
- Dependency:      Zod pre-step.

---

## AGENT B — docs-layer (all new files, no existing file overlap)

Defects: DEFECT-011 (STD-06), DEFECT-012 (STD-07), DEFECT-024 (STD-16), DEFECT-025 (STD-17), DEFECT-026 (STD-18), DEFECT-027 (STD-19), DEFECT-028 (STD-25), DEFECT-030 (STD-29)

### FILE: .env.example
- Current state:   Missing.
- Defects:         DEFECT-011
- Changes:         Create .env.example listing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SENTRY_DSN with placeholder values and one-line descriptions.
- Regression risk: None
- Standards met:   STD-06

### FILE: .nvmrc
- Current state:   Missing.
- Defects:         DEFECT-012
- Changes:         Create .nvmrc pinning to current LTS (22).
- Regression risk: None
- Standards met:   STD-07

### FILE: README.md
- Current state:   Vite template boilerplate.
- Defects:         DEFECT-027
- Changes:         Replace entirely with SSME-specific content: purpose, prerequisites (Node 22, npm, Supabase project access), setup steps (.env.local, npm install, npm run dev), deploy notes (Cloudflare Workers, wrangler.toml), module role (source of truth for all SSME Hub modules).
- Regression risk: None
- Standards met:   STD-19

### FILE: HANDOVER.md
- Current state:   Missing.
- Defects:         DEFECT-025
- Changes:         Create at project root following the 10-section schema: what it does, how to run, architecture (Vite SPA → Supabase → Cloudflare Worker), module reference (one sentence per file), env vars, known failure modes (missing Storage bucket, RLS rejection, missing env var), fragile components (RLS policies, customers.id rename), how to add a feature, open items (Migration 011 pending, Quotation App find-replace for customer_id, UI execution pending).
- Regression risk: None
- Standards met:   STD-17

### FILE: docs/adr/ADR-001-tech-stack.md
- Current state:   Missing.
- Defects:         DEFECT-026
- Changes:         Create ADR documenting: React+Vite (over Next.js — no SSR needed, static SPA sufficient), Supabase (over raw Postgres — auth + RLS + Storage bundled), Cloudflare Workers (over Vercel — SSME Hub already on CF, workers-sites pattern).
- Regression risk: None
- Standards met:   STD-18

### FILE: docs/adr/ADR-002-customer-id-rename.md
- Current state:   Missing.
- Defects:         DEFECT-026
- Changes:         Create ADR for customers.id → customer_id rename in migration 010. Document: context (Module 1 schema consistency), decision (rename to customer_id), cross-repo impact (Quotation App requires find-replace on customers.id), migration approach (ALTER + FK drop/restore), review trigger (Quotation App merge).
- Regression risk: None
- Standards met:   STD-18

### FILE: docs/runbooks/supabase-rls-rejection.md
- Current state:   Missing.
- Defects:         DEFECT-024
- Changes:         Create runbook: Symptom (403 from Supabase, "new row violates row-level security policy"), Root cause (user role missing or get_user_role() returning null), Diagnostic (check auth.users metadata, run SELECT get_user_role() as authenticated user), Fix steps (set user role in Supabase Dashboard → User Management), Verification (retry operation).
- Regression risk: None
- Standards met:   STD-16

### FILE: docs/runbooks/storage-bucket-missing.md
- Current state:   Missing.
- Defects:         DEFECT-024
- Changes:         Create runbook: Symptom (uploadDocument throws "Bucket not found"), Root cause (vehicle-documents bucket not created in Supabase Dashboard — manual setup step), Fix (Supabase Dashboard → Storage → New Bucket → "vehicle-documents", private), Verification (upload a test file).
- Regression risk: None
- Standards met:   STD-16

### FILE: docs/runbooks/env-var-missing.md
- Current state:   Missing.
- Defects:         DEFECT-024
- Changes:         Create runbook: Symptom (app throws "Missing Supabase environment variables" on startup), Root cause (.env.local not created), Fix (copy .env.example to .env.local, fill in values from Supabase project settings), Verification (npm run dev starts without error).
- Regression risk: None
- Standards met:   STD-16

### FILE: docs/perf-budgets.md
- Current state:   Missing.
- Defects:         DEFECT-024
- Changes:         Create with Supabase query targets (customer list < 500ms, vehicle lookup by plate < 200ms), Cloudflare Worker cold-start budget (< 50ms), Storage upload limit (10MB per file, per ALLOWED_FILE_TYPES constant).
- Regression risk: None
- Standards met:   STD-16

### FILE: CLAUDE.md (domain rules section only)
- Current state:   Has role names + key paths but no mandatory-variables section.
- Defects:         DEFECT-028
- Changes:         Add "Domain rules — mandatory variables" section listing: entity_type enum, id_type enum, doc_type enum, status values, role values — each with allowed values and reason. Add "Domain rules — forbidden patterns" section: no SELECT * without WHERE on vehicles, no hardcoded role strings (use the enum).
- Regression risk: None
- Standards met:   STD-25

### FILE: .github/PULL_REQUEST_TEMPLATE.md
- Current state:   Missing (.github/ dir doesn't exist).
- Defects:         DEFECT-030
- Changes:         Create with: Summary section, Why section (required — describe business reason not implementation), Test plan, Breaking changes checklist.
- Regression risk: None
- Standards met:   STD-29

### FILE: DECISIONS.log
- Current state:   Missing.
- Defects:         DEFECT-030
- Changes:         Create at repo root as append-only log. First entries: stack selection (2026-05-20), schema rename (2026-05-20), sober audit (2026-05-21).
- Regression risk: None
- Standards met:   STD-29

---

## AGENT C — entry-layer (main.jsx only)

Defects: DEFECT-022 (STD-14), DEFECT-023 (STD-15)

### FILE: src/main.jsx
- Current state:   Bare React root mount. No Sentry, no global error handler.
- Defects:         DEFECT-023 (STD-15), DEFECT-022 (STD-14)
- Changes:
  1. Import and init Sentry: `Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE, integrations: [Sentry.reactRouterV6BrowserTracingIntegration()] })`.
  2. Add `window.addEventListener('unhandledrejection', ...)` logging structured JSON to Sentry.captureException.
  3. Add `window.addEventListener('error', ...)` for synchronous errors.
  4. Guard: if VITE_SENTRY_DSN is absent, skip Sentry init silently (dev mode without DSN should still work).
- Regression risk: Low — Sentry init is additive; missing DSN is handled gracefully.
- Mitigation:      Guard on VITE_SENTRY_DSN prevents startup break in dev.
- Standards met:   STD-15, STD-14
- Dependency:      @sentry/react must be installed (pre-step).

---

## AGENT D — test-layer (new __tests__/ files only)

Defects: DEFECT-015 (STD-09), DEFECT-016 (STD-09), DEFECT-017 (STD-09)
Dependency: Run AFTER Wave 1. Needs Zod schemas from Agent A to write validation-error tests.

### FILE: src/__tests__/customers.test.js
- Current state:   Does not exist.
- Defects:         DEFECT-015
- Changes:         Create using vitest + vi.mock('@supabase/supabase-js'). Cover: getCustomers (nominal, search param, error path), getCustomerById (nominal, not found), createCustomer (nominal, Zod validation rejects invalid input), updateCustomer (nominal, Zod rejects unknown fields).
- Regression risk: None
- Standards met:   STD-09

### FILE: src/__tests__/vehicles.test.js
- Current state:   Does not exist.
- Defects:         DEFECT-016
- Changes:         Cover: getVehiclesByCustomer (nominal), getVehicleByPlate (plate normalisation — input "abc 1234" → stored as "ABC 1234", Zod rejects missing plate_number), createVehicle (nominal, validation error), updateVehicleMileage (nominal), getReplacementTargets (nominal).
- Regression risk: None
- Standards met:   STD-09

### FILE: src/__tests__/documents.test.js
- Current state:   Does not exist.
- Defects:         DEFECT-017
- Changes:         Cover: uploadDocument (nominal, file type rejected for .exe, file size rejected > 10MB, Storage-succeeds/DB-fails atomicity failure mode documented as known gap), createDocument (nominal, invalid doc_type rejected by Zod), getDocumentsByVehicle (nominal), getExpiryAlerts (nominal).
- Regression risk: None
- Standards met:   STD-09

---

## AGENT E — lint-layer (eslint.config.js + package.json)

Defects: DEFECT-019 (STD-11)

### FILE: eslint.config.js
- Current state:   Has react-hooks and react-refresh plugins only.
- Defects:         DEFECT-019
- Changes:         Add eslint-plugin-security. Add rule set: `'plugin:security/recommended'`. Add `eslint-plugin-n` for Node.js rules if applicable.
- Regression risk: Low — new rules may surface existing warnings; fix any that appear.
- Standards met:   STD-11

### FILE: package.json
- Current state:   No security ESLint plugin in devDeps.
- Defects:         DEFECT-019
- Changes:         Add eslint-plugin-security to devDependencies (done by npm install in pre-step; verify entry added correctly).
- Standards met:   STD-11
- Dependency:      eslint-plugin-security install (pre-step).
