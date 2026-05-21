# HANDOVER DOCUMENT
Version : 1
Date    : 2026-05-21
Updated : 2026-05-21

## 1. WHAT THIS SYSTEM DOES

SSME Customers is Module 1 of the SSME Hub, a 10-module internal platform for Soon Seng Motors Enterprise (1988) Sdn. Bhd. — a HINO commercial vehicle dealer in Kota Bharu, Kelantan. This module is the single source of truth for every customer record and every vehicle (truck/bus) the company has sold or serviced. Every other SSME Hub module reads from this database.

The system lets SSME staff search customers by company name, look up vehicles by plate number, track document expiry dates (road tax, insurance, PUSPAKOM inspection), and identify trucks nearing replacement age via the fleet age risk index (RRI). Access is role-based: admin sees everything; finance sees financial data; sales manages customers and vehicles; workshop reads vehicles and documents.

## 2. HOW TO RUN IT

Prerequisites:
- Node.js 22 (`nvm use` uses `.nvmrc`)
- npm 10+
- Supabase project access (URL + anon key from project owner)

Setup:
```sh
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev                   # starts at http://localhost:5173
```

Verify: App loads at `http://localhost:5173` without "Missing Supabase environment variables" in the console.

## 3. ARCHITECTURE

```
Browser (React 19 SPA + Tailwind CSS 4)
  ↓ HTTPS — Supabase JS client (direct, no server intermediary)
Supabase (gruvcmbsvoauhftfcoio.supabase.co)
  ├─ PostgreSQL — customers, vehicles, vehicle_documents, vehicle_models, ownership_transfers, import_staging
  ├─ Auth — JWT roles (admin/finance/sales/workshop), get_user_role() used by RLS policies
  └─ Storage — vehicle-documents bucket (private, RLS-enforced)
  ↓ Built as static assets
Cloudflare Workers (customers.ssmehub.com)
```

All DB access goes directly from the browser to Supabase. RLS policies on every table enforce role-based access at the DB layer — the frontend cannot bypass them.

## 4. MODULE REFERENCE

| File | Purpose |
|---|---|
| `src/main.jsx` | React entry point; initialises Sentry error tracking; adds global unhandledrejection and error listeners |
| `src/App.jsx` | App shell — routing and layout (UI build pending, see open items) |
| `src/lib/supabase.js` | Creates and exports the Supabase client; throws on startup if VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing |
| `src/lib/db/customers.js` | Customer CRUD — Zod-validated writes (CustomerInsertSchema, CustomerUpdateSchema), structured error logging |
| `src/lib/db/vehicles.js` | Vehicle CRUD — Zod-validated inserts (VehicleInsertSchema), plate/chassis/engine normalised to uppercase, RRI-based fleet age queries |
| `src/lib/db/documents.js` | Vehicle document CRUD + Storage upload — file type/size guard (PDF/JPEG/PNG, 10 MB), Zod DocumentMetaSchema on all writes |
| `supabase/migrations/010_module1_full_schema.sql` | Full schema: customers + vehicles + vehicle_documents + views + RLS policies |
| `wrangler.toml` | Cloudflare Workers deploy configuration |
| `docs/adr/` | Architectural Decision Records |
| `docs/runbooks/` | Operational playbooks for known failure modes |

## 5. ENVIRONMENT VARIABLES

| Variable | Purpose | Source |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase Dashboard → Project Settings → API → anon/public |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN — optional, skipped if absent | Sentry Dashboard → Project Settings → Client Keys |

Copy `.env.example` to `.env.local` and fill in real values. Never commit `.env.local`.

## 6. KNOWN FAILURE MODES

| Symptom | Root cause | Fix |
|---|---|---|
| "Missing Supabase environment variables" on startup | `.env.local` not created | `cp .env.example .env.local`, fill in values, restart dev server |
| 403 from any Supabase DB call | User role missing or `get_user_role()` null | See `docs/runbooks/supabase-rls-rejection.md` |
| "Bucket not found" on document upload | `vehicle-documents` Storage bucket not created | See `docs/runbooks/storage-bucket-missing.md` |
| White screen on load | Build error or missing env var | Check browser console; verify `.env.local` |

## 7. FRAGILE COMPONENTS

| Area | Risk | Reason |
|---|---|---|
| RLS policies (`migration 010`) | High | Complex RBAC across 6 tables. A policy mistake silently locks out users or leaks data. Test all 4 roles after any schema change. |
| `customers.customer_id` rename | High | Migration 010 renamed `customers.id` → `customer_id`. Quotation App has not been updated yet. Do NOT run migration 010 on shared production DB until Quotation App find-replace is done. |
| Migration 011 (not written) | Medium | Storage RLS policies not yet written. `vehicle-documents` bucket is unprotected at the Storage layer until 011 is applied. |
| `uploadDocument` atomicity | Medium | Storage upload and DB insert are not atomic. If Storage succeeds and DB insert fails, an orphaned file remains in Storage. No cleanup logic exists yet. |
| Supabase `getPublicUrl` | Low | Returns a URL unconditionally, even if the file doesn't exist. App should handle 404 when rendering document URLs. |

## 8. HOW TO ADD A NEW FEATURE

1. Check `CLAUDE.md` — domain rules and mandatory variables must be respected.
2. Write or update the relevant `src/lib/db/*.js` function. All write paths need Zod validation.
3. Add or update tests in `src/__tests__/`. Tests must be committed in a SEPARATE commit from the implementation.
4. If the feature changes the DB schema: write a new `supabase/migrations/NNN_*.sql` and add an ADR in `docs/adr/`.
5. Update `HANDOVER.md` section 4 (module reference) and section 7 (fragile areas) if applicable.
6. Open a PR using the `.github/PULL_REQUEST_TEMPLATE.md` — the Why section is required.

## 9. OPEN ITEMS

| Item | Priority | Notes |
|---|---|---|
| Migration 011 — Storage RLS policies | High | `vehicle-documents` bucket needs RLS policies before documents feature ships to production |
| Quotation App `customer_id` find-replace | High | Hard blocker before migration 010 on shared production DB. See `docs/adr/ADR-002-customer-id-rename.md`. |
| UI execution | High | 16-task plan at `docs/superpowers/plans/2026-05-20-module1-ui.md` — not started |
| `uploadDocument` atomicity | Medium | Add Storage cleanup (delete the uploaded file) if the DB insert fails |
| CI workflow | Medium | No `.github/workflows/ci.yml` yet. See `.planning/audit-001/BACKLOG.md`. |
| `uploadDocument` orphan cleanup | Medium | If DB insert fails after Storage upload, file remains. Add rollback logic. |

## 10. SESSION METRICS

sober audit-001 run 2026-05-21. Score: 7.6/10 (NEAR-READY). 30 defects found (0 Critical, 21 High, 8 Medium, 1 Low).
Remediation branch: `feature/audit-001`.
Next: run `/sober evaluate` after merging audit branch. Full context in `.planning/audit-001/`.
