# SSME Customers — Module 1

Customer and fleet database for **Soon Seng Motors Enterprise (1988) Sdn. Bhd.**, Kota Bharu, Kelantan.
Single source of truth for every customer and vehicle at SSME. All other SSME Hub modules read from this.

Part of **SSME Hub** (ssmehub.com) — Module 1 of 10.

## Prerequisites

- Node.js 22 (use `nvm use` with the included `.nvmrc`)
- npm 10+
- Access to the Supabase project (`gruvcmbsvoauhftfcoio.supabase.co`) — request credentials from the project owner

## Setup

```sh
# 1. Install dependencies
npm install

# 2. Create local env file
cp .env.example .env.local
# Edit .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Start dev server
npm run dev
# App runs at http://localhost:5173
```

## Supabase manual step

Before uploading vehicle documents, the `vehicle-documents` Storage bucket must exist:
1. Supabase Dashboard → Storage → New Bucket
2. Name: `vehicle-documents`, Access: **Private**

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run vitest test suite |

## Deploy

Deployed to **Cloudflare Workers** at `customers.ssmehub.com` via Wrangler:

```sh
npx wrangler deploy
```

## Auth roles

| Role | Permissions |
|---|---|
| admin | Full access including financial data |
| finance | Read/write financial data, read-only others |
| sales | Read/write customers and vehicles |
| workshop | Read-only vehicles and documents |

## Module architecture

```
src/
  lib/
    supabase.js          Supabase client (validates env vars on startup)
    db/
      customers.js       Customer CRUD (Zod-validated writes)
      vehicles.js        Vehicle CRUD (Zod-validated writes, plate normalisation)
      documents.js       Vehicle document CRUD + Storage upload (file type/size guarded)
  __tests__/             Unit tests (vitest)
  App.jsx                App shell (UI build pending)
  main.jsx               React entry point + Sentry init + global error handlers
supabase/
  migrations/            010 SQL migration files — current schema
docs/
  adr/                   Architectural Decision Records
  runbooks/              Operational playbooks
  perf-budgets.md        Query and bundle performance targets
```

## Cross-module impact

Migration 010 renamed `customers.id` to `customers.customer_id`. The **Quotation App** must run a find-replace before merging. See `docs/adr/ADR-002-customer-id-rename.md`.
