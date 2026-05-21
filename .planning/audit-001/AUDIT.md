# AUDIT — SSME Customers — audit-001 — 2026-05-21

## System overview

SSME Customers (Module 1 of 10) is the customer and fleet database for Soon Seng Motors Enterprise (1988) Sdn. Bhd., a commercial vehicle dealer in Kota Bharu, Kelantan. It serves as the single source of truth for all customer records, vehicles, and vehicle documents across the SSME Hub. Every other hub module reads from it.

Stack: React 19 + Tailwind CSS + Vite 8, Supabase (PostgreSQL), deployed to Cloudflare Workers at customers.ssmehub.com. Auth via Supabase with four roles (admin, finance, sales, workshop). The backend layer is 8 JS source files — three DB helper modules, a Supabase client, an App shell, and entry point. UI is not yet built (UI plan committed, execution pending).

---

## Onboarding readiness — current state

| Criterion | Verdict | Blocking standard(s) |
|---|---|---|
| Developer onboards within 20 min | PARTIAL | STD-17 (HANDOVER.md missing), STD-19 (README is Vite boilerplate) |
| Defect isolated without escalation | PARTIAL | STD-15 (no Sentry), STD-16 (no runbooks) |
| Feature added without regression | FAIL | STD-05 (all write paths unvalidated, score 3.3) |
| Crash debuggable from logs alone | PARTIAL | STD-13 (unstructured errors), STD-15 (no error tracking) |

---

## Quality scorecard

| Standard | Description | Score (/10) | Defects | Blocks onboarding |
|---|---|---|---|---|
| STD-01 | Inline Documentation | 6.0 | 3 High | No |
| STD-02 | Code Simplicity (KISS) | 10.0 | 0 | No |
| STD-03 | Code Style | 9.8 | 1 Med | No |
| STD-04 | Type Safety | 8.7 | 1 High | No |
| STD-05 | Input Validation at Boundaries | **3.3** | 5 High | **YES — Criterion 3 FAIL** |
| STD-06 | Secrets & Config Hygiene | 9.5 | 1 High | No |
| STD-07 | Dependency Hygiene | 8.0 | 1 Med | No |
| STD-08 | AI-Output Hygiene | 9.6 | 1 Med, 1 Low | No |
| STD-09 | Unit Tests + Branch Coverage | 6.0 | 3 High | No |
| STD-10 | Property-Based Tests | 9.3 | 1 Med | No |
| STD-11 | Static Analysis | 9.5 | 1 High | No |
| STD-12 | CI Baseline | 8.0 | 1 Med* | No |
| STD-13 | Structured Error Handling & Logging | 8.7 | 1 High | Partial |
| STD-14 | Observability + Anomaly Alerts | 8.0 | 1 Med† | Partial |
| STD-15 | Remote Error Tracking | 6.0 | 1 High | Partial |
| STD-16 | Operational Playbook | 6.0 | 1 High | Partial |
| STD-17 | HANDOVER.md | 6.0 | 1 High | **YES — Criterion 1** |
| STD-18 | Architectural Decision Records | 6.0 | 1 High | No |
| STD-19 | Documentation Freshness | 6.0 | 1 High | **YES — Criterion 1** |
| STD-20 | Accessibility | 9.0 | 0 (shell)‡ | No |
| STD-21 | Refactor Exit Rule | 10.0 | 0 | No |
| STD-23 | Performance Hotspots (N+1) | 10.0 | 0 | No |
| STD-24 | Session-State Hygiene (AGENTS.md) | 9.0 | 1 Low | No |
| STD-25 | Domain Guardrails | 8.0 | 1 Med | No |
| STD-26 | Touch Rule + Test Separation | 8.7 | 1 High | No |
| STD-27 | Hard Scope Limits | 10.0 | 0 | No |
| STD-28 | Contract Freezing | 10.0 | 0 | No |
| STD-29 | Rule File Discipline | 8.0 | 1 Med | No |

*Tiny project escape hatch applied: CI High → Medium.
†Frontend SPA downgrade applied: observability Medium.
‡App is pre-build shell; UI not yet implemented.

### Pillar scores

| Pillar | Score | Weight | Weighted |
|---|---|---|---|
| I PREVENT | 8.7 | 0.20 | 1.74 |
| II DETECT | 8.2 | 0.20 | 1.64 |
| III OBSERVE | 7.6 | 0.20 | 1.52 |
| IV RESPOND | 6.0 | 0.15 | 0.90 |
| V HANDOVER | 6.5 | 0.20 | 1.30 |
| VI INTERFACE | 9.0 | 0.05 | 0.45 |

## Overall: 7.6 / 10 — NEAR-READY

---

## Defect register

**DEFECT-001**
- File:      src/lib/db/customers.js:1
- Standard:  STD-01
- Severity:  High
- Pillar:    I
- Observe:   4 exported async functions (getCustomers, getCustomerById, createCustomer, updateCustomer) have zero JSDoc — no @param, @returns, @throws.
- Impact:    Callers cannot know what shape customerData/updates expects without reading the body. Especially painful for createCustomer which accepts an unconstrained object.
- Fix:       Add JSDoc block with @param (typed), @returns, @throws to each exported function.

**DEFECT-002**
- File:      src/lib/db/vehicles.js:1
- Standard:  STD-01
- Severity:  High
- Pillar:    I
- Observe:   5 exported async functions (getVehiclesByCustomer, getVehicleByPlate, createVehicle, updateVehicleMileage, getReplacementTargets) have zero JSDoc.
- Impact:    The plate normalisation behaviour (toUpperCase) and the mileage date derivation logic are invisible to callers.
- Fix:       Add JSDoc with @param (typed), @returns, @throws to each exported function.

**DEFECT-003**
- File:      src/lib/db/documents.js:1
- Standard:  STD-01
- Severity:  High
- Pillar:    I
- Observe:   4 exported async functions (getExpiryAlerts, getDocumentsByVehicle, uploadDocument, createDocument) have zero JSDoc. uploadDocument has complex multi-step logic (Storage upload + DB insert) with no documentation.
- Impact:    The docMeta spread contract is invisible; callers cannot know which fields are required without reading both the function body and the SQL schema.
- Fix:       Add JSDoc with @param (typed including docMeta shape), @returns, @throws, @example to uploadDocument especially.

**DEFECT-004**
- File:      project root
- Standard:  STD-03
- Severity:  Medium
- Pillar:    I
- Observe:   ESLint is configured but no Prettier config (.prettierrc) and no pre-commit hook (.husky/pre-commit). npm run lint exists but is not enforced on commit.
- Impact:    Format divergence accumulates silently across sessions; lint violations slip into commits.
- Fix:       Add .prettierrc, install husky + lint-staged, add pre-commit hook running `eslint --max-warnings 0 && prettier --check`.

**DEFECT-005**
- File:      src/lib/db/customers.js, vehicles.js, documents.js
- Standard:  STD-04
- Severity:  High
- Pillar:    I
- Observe:   No `// @ts-check` at the top of any JS file. No JSDoc type annotations on any parameter. All function params (customerId, vehicleData, docMeta, mileageKm etc.) are untyped.
- Impact:    Type errors on DB call inputs are silent until Supabase returns a 400. Callers pass wrong types without any editor signal.
- Fix:       Add `// @ts-check` to each lib file. Add `/** @param {string} customerId */` etc. JSDoc types. Consider full TS migration when UI is built.

**DEFECT-006**
- File:      src/lib/db/customers.js:37
- Standard:  STD-05
- Severity:  High
- Pillar:    I
- Observe:   createCustomer(customerData) passes the raw argument directly to supabase.insert(customerData) with no schema validation. Any extra fields, wrong types, or missing required fields are silently passed to Postgres.
- Impact:    Write path is fully open. A caller could insert arbitrary fields or trigger a Postgres CHECK violation with a confusing error rather than a client-side validation message.
- Fix:       Add Zod/Yup schema for CustomerInsert, validate before insert, throw a typed ValidationError on failure.

**DEFECT-007**
- File:      src/lib/db/customers.js:47
- Standard:  STD-05
- Severity:  High
- Pillar:    I
- Observe:   updateCustomer(customerId, updates) spreads raw `updates` to supabase.update(updates) with no allowlist or validation.
- Impact:    Caller can silently overwrite any column including status, entity_type, id_number. No field-level protection.
- Fix:       Define an allowlist of updatable fields or a Zod partial schema. Strip extra keys before the update call.

**DEFECT-008**
- File:      src/lib/db/vehicles.js:29
- Standard:  STD-05
- Severity:  High
- Pillar:    I
- Observe:   createVehicle(vehicleData) spreads vehicleData directly into insert with only optional normalisation of plate/chassis/engine strings. No required-field check, no type check, no unknown-field stripping.
- Impact:    Missing mandatory fields (plate_number, customer_id) cause Postgres NOT NULL violations with cryptic messages instead of client validation errors.
- Fix:       Add Zod schema for VehicleInsert; validate before insert.

**DEFECT-009**
- File:      src/lib/db/documents.js:24
- Standard:  STD-05
- Severity:  High
- Pillar:    I
- Observe:   uploadDocument(vehicleId, file, docMeta) spreads ...docMeta into the insert without validation. Also: file type and file size are not checked before Storage upload. Any file extension is accepted.
- Impact:    An attacker or accident can upload .exe or 500MB files. docMeta fields (doc_type especially) must match a DB CHECK constraint — but failure gives a DB error rather than a client validation message.
- Fix:       Add file type allowlist (pdf, jpg, png), max size guard, and Zod schema for DocumentMeta (including doc_type enum validation).

**DEFECT-010**
- File:      src/lib/db/documents.js:54
- Standard:  STD-05
- Severity:  High
- Pillar:    I
- Observe:   createDocument(vehicleId, docData) spreads raw docData with no validation.
- Impact:    Same as DEFECT-009 for the non-upload path.
- Fix:       Add Zod schema for DocumentInsert, validate before insert.

**DEFECT-011**
- File:      project root
- Standard:  STD-06
- Severity:  High
- Pillar:    I
- Observe:   .env.example is missing. Only .env.local exists (uncommitted, per gitignore). A new developer has no record of which env vars are required.
- Impact:    New dev clones repo, runs dev server, gets an unhandled throw at supabase.js:6 with no explanation of what to set.
- Fix:       Create .env.example with VITE_SUPABASE_URL=your_url_here and VITE_SUPABASE_ANON_KEY=your_key_here (no real values). Commit it.

**DEFECT-012**
- File:      project root
- Standard:  STD-07
- Severity:  Medium
- Pillar:    I
- Observe:   No .nvmrc or .node-version file. Node.js version is unpinned.
- Impact:    Node version drift between developer machines and CI/deploy can cause silent build differences.
- Fix:       Add .nvmrc with current Node LTS version.

**DEFECT-013**
- File:      README.md
- Standard:  STD-08
- Severity:  Medium
- Pillar:    I
- Observe:   README.md is the unmodified Vite template boilerplate ("React + Vite", describes the Vite scaffold, links to Vite docs). It contains zero SSME project information.
- Impact:    A new team member reading README has no idea what this project does, how to configure it, or how to run it.
- Fix:       Replace README with SSME-specific content: project purpose, prerequisites, setup steps, env vars, deploy notes.

**DEFECT-014**
- File:      src/assets/react.svg, src/assets/vite.svg
- Standard:  STD-08
- Severity:  Low
- Pillar:    I
- Observe:   Vite template placeholder assets remain committed. If App.jsx still references them, they are dead weight; if not, they are dead files.
- Impact:    Minor repo noise; no runtime impact.
- Fix:       Remove unused assets after UI build confirms they are not referenced.

**DEFECT-015**
- File:      src/lib/db/customers.js
- Standard:  STD-09
- Severity:  High
- Pillar:    II
- Observe:   Zero test files exist for any function. getCustomers, getCustomerById, createCustomer, updateCustomer have no unit tests.
- Impact:    createCustomer and updateCustomer are write paths with no regression protection. Any change could break silently.
- Fix:       Add __tests__/customers.test.js covering nominal, boundary (empty search, missing id), and error paths for all 4 functions.

**DEFECT-016**
- File:      src/lib/db/vehicles.js
- Standard:  STD-09
- Severity:  High
- Pillar:    II
- Observe:   Zero tests for getVehiclesByCustomer, getVehicleByPlate, createVehicle, updateVehicleMileage, getReplacementTargets.
- Impact:    createVehicle normalisation logic (plate uppercase, chassis uppercase) is untested. A refactor could silently break the truck dealer's plate-first lookup workflow.
- Fix:       Add __tests__/vehicles.test.js with nominal + boundary + error paths. Specifically test plate normalisation.

**DEFECT-017**
- File:      src/lib/db/documents.js
- Standard:  STD-09
- Severity:  High
- Pillar:    II
- Observe:   Zero tests for uploadDocument or createDocument. uploadDocument has multi-step logic (Storage + DB insert) with no test coverage.
- Impact:    uploadDocument failure modes (Storage error followed by DB insert) are untested. If Storage succeeds but DB insert fails, there is no cleanup.
- Fix:       Add __tests__/documents.test.js. Mock supabase.storage. Test the Storage-succeeds/DB-fails failure mode specifically.

**DEFECT-018**
- File:      src/lib/db/
- Standard:  STD-10
- Severity:  Medium
- Pillar:    II
- Observe:   No fast-check or property-based testing. Pure utility paths (plate normalisation, mileage date derivation, file path construction) have no PBT coverage.
- Impact:    Edge cases in plate formats (e.g., "ABC 1234", "WA 9999X", leading spaces) won't be found until a real plate triggers a bug.
- Fix:       Add fast-check for getVehicleByPlate plate normalisation (arbitrary string input) and uploadDocument filePath construction (arbitrary file names).

**DEFECT-019**
- File:      project root
- Standard:  STD-11
- Severity:  High
- Pillar:    II
- Observe:   No semgrep configuration, no gitleaks, no eslint-plugin-security. ESLint only covers react-hooks and react-refresh.
- Impact:    Security smells (e.g., missing auth checks, prototype pollution patterns) go undetected on every commit.
- Fix:       Add eslint-plugin-security to ESLint config. Add .gitleaks.toml for secret scanning. Consider semgrep CI step.

**DEFECT-020**
- File:      project root
- Standard:  STD-12
- Severity:  Medium
- Pillar:    II
- Observe:   No .github/workflows/ directory. No CI pipeline. [Tiny project escape hatch: High→Medium.]
- Impact:    PRs merged without lint, type-check, or test gate.
- Fix:       Add .github/workflows/ci.yml running: lint, build, and (when tests exist) test suite.

**DEFECT-021**
- File:      src/lib/db/customers.js, vehicles.js, documents.js
- Standard:  STD-13
- Severity:  High
- Pillar:    III
- Observe:   All 13 exported functions use bare `if (error) throw error`. Errors are re-thrown as raw Supabase PostgrestError objects with no operation context, no parameter snapshot, no timestamp.
- Impact:    When a caller catches an error, the stack trace reveals the DB layer but not which operation failed or with what inputs. Debugging in production is guesswork.
- Fix:       Wrap each function in try/catch. On catch, create a structured error: `{ operation: 'createCustomer', params: { ... }, message: error.message, code: error.code, ts: new Date().toISOString() }`. Log to console.error (structured JSON) and re-throw.

**DEFECT-022**
- File:      src/main.jsx (entry point)
- Standard:  STD-14
- Severity:  Medium
- Pillar:    III
- Observe:   No client-side global error handler (window.onerror / unhandledrejection listener). No health/metrics endpoint. [SPA downgrade applied.]
- Impact:    Unhandled promise rejections in the UI are silent. No way to know if the app is broken without a user report.
- Fix:       Add window.addEventListener('unhandledrejection', ...) and window.addEventListener('error', ...) in main.jsx that log structured errors to the error tracker (after DEFECT-023 is fixed).

**DEFECT-023**
- File:      src/main.jsx:1
- Standard:  STD-15
- Severity:  High
- Pillar:    III
- Observe:   No Sentry (or equivalent) SDK imported or initialised anywhere. No error tracking at all.
- Impact:    Production errors are invisible unless a user reports them. No stack trace, no context, no breadcrumbs.
- Fix:       Install @sentry/react, initialise in main.jsx with DSN from env var (VITE_SENTRY_DSN). Capture unhandled exceptions and promise rejections. Attach user context (role) once auth is wired.

**DEFECT-024**
- File:      project root
- Standard:  STD-16
- Severity:  High
- Pillar:    IV
- Observe:   No docs/runbooks/ directory. No docs/perf-budgets.md. No documented failure modes or response procedures.
- Impact:    When a known failure occurs (e.g., Supabase RLS rejecting a query, Storage bucket missing, Cloudflare Worker deployment failure) there is no diagnostic playbook.
- Fix:       Create docs/runbooks/ with at minimum: supabase-rls-rejection.md, storage-bucket-missing.md, env-var-missing.md. Create docs/perf-budgets.md with Supabase query targets and Cloudflare Worker cold-start budget.

**DEFECT-025**
- File:      project root
- Standard:  STD-17
- Severity:  High
- Pillar:    V
- Observe:   HANDOVER.md is absent from the repo root.
- Impact:    A new developer (or Jason returning after 3 months) has no consolidated reference for architecture, env setup, fragile components, or open items.
- Fix:       Create HANDOVER.md following the 10-section template. At minimum: what it does, how to run, env vars, known fragile areas (RLS policies, Storage bucket manual step), open items (Migration 011, Quotation App find-replace).

**DEFECT-026**
- File:      project root (docs/adr/)
- Standard:  STD-18
- Severity:  High
- Pillar:    V
- Observe:   No docs/adr/ directory. Major decisions made with no ADR: React+Vite over Next.js, Supabase over raw Postgres, Cloudflare Workers over Vercel/Node, Supabase Auth over custom auth, customers.id→customer_id rename (cross-repo impact).
- Impact:    When a future developer questions a stack choice, there is no decision trail. The customers.id rename in particular has cross-repo impact on the Quotation App with no documented rationale.
- Fix:       Create docs/adr/ADR-001-tech-stack.md and ADR-002-schema-customer-id-rename.md as minimum. ADR-002 should explicitly document the Quotation App find-replace requirement.

**DEFECT-027**
- File:      README.md
- Standard:  STD-19
- Severity:  High
- Pillar:    V
- Observe:   README.md describes the Vite scaffold template, not SSME Customers. The "How to run" instructions reference Vite template plugins. No mention of Supabase, env vars, or deployment target.
- Impact:    Following README.md as written will produce a broken setup (no env vars, no Supabase connection). Onboarding blocks immediately.
- Fix:       Replace with project README covering: purpose, prerequisites (Node, Supabase CLI, npm), setup (clone, .env.local, npm install, npm run dev), deploy target.

**DEFECT-028**
- File:      CLAUDE.md
- Standard:  STD-25
- Severity:  Medium
- Pillar:    I
- Observe:   CLAUDE.md has role names and key paths but no formal "Domain rules — mandatory variables" section listing business invariants (e.g., valid entity_type values, id_type values, doc_type enum, status values) with reasons. No "Domain rules — forbidden patterns" section.
- Impact:    AI sessions may generate code using wrong enum values or incorrect status strings without a documented check.
- Fix:       Add a "Domain rules — mandatory variables" section listing enum values and why they matter. Add "Domain rules — forbidden patterns" (e.g., never SELECT * from vehicles without a WHERE).

**DEFECT-029**
- File:      src/lib/db/ (all three files)
- Standard:  STD-26
- Severity:  High
- Pillar:    I
- Observe:   All 8 source files are 100% AI-generated. No human modifications are recorded in git history. Tests (which should be in a separate session/commit) do not exist.
- Impact:    Ownership debt: debugging any DB function takes 3–5× longer than authored code. No human has validated the business-logic correctness of the query shapes or error paths.
- Fix:       Before merge to main, each lib file should have at least one non-trivial human modification (e.g., add a missing edge case, rename a variable to match domain language). Tests (DEFECT-015–017) must be committed in a separate session.

**DEFECT-030**
- File:      project root (.github/)
- Standard:  STD-29
- Severity:  Medium
- Pillar:    V
- Observe:   No .github/PULL_REQUEST_TEMPLATE.md. No DECISIONS.log at repo root.
- Impact:    PRs are merged without a "Why" rationale. Institutional memory of what was decided and why never accumulates in the repo.
- Fix:       Add .github/PULL_REQUEST_TEMPLATE.md with a Why section (required, CI reject if empty). Create DECISIONS.log as an append-only markdown log of major decisions.

---

**30 defects total: 0 Critical · 21 High · 8 Medium · 1 Low**

---

## Honest narrative

This codebase is a well-architected DB layer for a real operational system, not toy code. The Supabase schema (migration 010) is production-quality: UUIDs, proper FKs, RLS policies, triggers, and domain-correct CHECK constraints. The three JS library files are clean, readable, and all fail-fast (no silent swallows). The startup env validation in supabase.js is exactly right. Structurally this is not typical vibe-coded output — the domain model clearly reflects a truck dealer's operational reality (plate-first lookup, PUSPAKOM, road tax expiry alerts, fleet age scoring).

The risks are concentrated in four areas. First, **input validation is entirely absent on all write paths** (STD-05 score: 3.3) — every write function accepts unconstrained raw objects and passes them directly to Postgres, relying on DB constraints to catch bad inputs. This is the single most important fix before the UI goes live, because bad inputs will produce cryptic Postgres errors rather than user-friendly validation messages. Second, **there are zero tests** on 13 domain-critical functions — the mileage tracking, plate normalisation, and document upload paths are entirely untested. Third, the **handover layer (HANDOVER.md, ADRs, runbooks) is completely absent** — the project exists only in CLAUDE.md session notes and planning docs. Fourth, **error observability is missing** — no Sentry means production failures are invisible.

The good news: this is a pre-UI codebase. The shell (App.jsx, main.jsx) has not been built out yet, so most of these gaps exist before any user-facing surface is live. The /sober plan phase should prioritise: (1) input validation for write paths, (2) HANDOVER.md + ADR-002 documenting the customer_id rename, (3) Sentry init and structured error wrapping, (4) .env.example + README rewrite. The test suite and CI can follow in the same audit branch without blocking the UI build plan.
