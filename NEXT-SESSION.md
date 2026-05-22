# NEXT SESSION
Updated: 2026-05-23

## Where we are
Module 1 UI merged to main and deployed to Cloudflare Workers at `ssme-customers.soonsengmotorsenterprise.workers.dev`. 2,504 customers imported from SQL Account Excel. Login page added (`jason@ssmehub.com` / `Ssme2025!`). All 16 UI tasks done, 5 critical bugs fixed, 5 priority fixes closed.

## Do first
1. **Vehicles data** — 2,504 customer accounts exist but ZERO vehicles. Jason has vehicle data (separate Excel). Each customer account can have multiple fleets — duplicate-looking company names are separate SQL Accounts, NOT duplicates.
2. **1000-record limit** — `src/lib/db/customers.js:177` (`getCustomersFiltered`) has no `.limit()` so Supabase defaults to 1000. Only 1000 of 2504 visible. Fix: add `.limit(5000)`.
3. **Push to GitHub** — 30 commits on main ahead of origin, not pushed.

## Pending / blocked
| Item | Status | Notes |
|---|---|---|
| Push to GitHub | Not pushed | 30 commits on main |
| Vehicles import | Blocked | Need vehicle data file from Jason |
| 1000-record limit | Not started | `src/lib/db/customers.js:177` needs `.limit(5000)` |
| Dashboard stats showing — | Investigate | Expiry alerts, fleet age show dash/loading — likely no vehicle data |
| Sober audit 5.8/10 | Pending | Down from 8.1. STD-04 types, STD-10 PBT, STD-12 CI are biggest gaps |
| Code review high findings | Pending | 4 high in `docs/audit/REVIEW-002.md` |
| Migration 010 Quotation App | Blocked (external) | ADR-002 |

## Key info
- **Deployed:** `https://ssme-customers.soonsengmotorsenterprise.workers.dev`
- **Supabase:** `gruvcmbsvoauhftfcoio.supabase.co` (ssme-hub)
- **Login:** `jason@ssmehub.com` / `Ssme2025!` (role=admin in app_metadata)
- **Customer Excel:** `/Users/teckchuan/Downloads/Cust Customer Listing 1.xlsx` (already imported)

## Launcher
- Double-click `~/Desktop/Claude.command`
- Pick model → pick project → `/start`
