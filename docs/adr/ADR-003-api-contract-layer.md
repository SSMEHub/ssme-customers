# ADR-003: API Contract Layer — `api` Schema Views

| Field | Value |
|---|---|
| Date | 2026-06-10 |
| Status | Accepted |
| Motivated by | ADR-002 (customers.id → customer_id rename broke Quotation App) |

## Context

Migration 010 renamed `customers.id` to `customers.customer_id` for internal consistency. This broke the Quotation App, which was reading the `public.customers` table directly. The same risk exists for every downstream module (Sales, Reminders, Quotation App, future modules): any internal column rename or table restructure in `public` becomes a cross-repo breaking change requiring coordinated deployment.

## Decision

Create a stable `api` schema (migration 013) consisting of `CREATE OR REPLACE VIEW` objects that expose a documented, versioned column contract over the raw `public` tables:

| View | Source | Key mapping |
|---|---|---|
| `api.customers` | `public.customers` | `company_name → name` |
| `api.vehicles` | `public.vehicles` | columns as-is |
| `api.vehicle_documents` | `public.vehicle_documents` | columns as-is |
| `api.expiry_alerts` | `public.expiry_alerts_view` | columns as-is |

**All downstream modules MUST read from `api.*` views. Direct reads from `public.*` tables are forbidden for cross-module consumers.**

## Linking keys

- Join customers to vehicles via `customer_id` (UUID).
- Join vehicles to documents via `vehicle_id` (UUID).
- These keys are stable across the contract layer and will never be renamed without a new ADR and a versioned replacement view.

## RLS pass-through

All views are created with `WITH (security_invoker = true)` (Postgres 15+). This means the base-table RLS policies on `public.customers`, `public.vehicles`, and `public.vehicle_documents` are evaluated against the **calling user's JWT**, not the view definer. The `api` schema adds no additional policies — the `public` RLS remains the single source of truth for access control.

## WARNING — service_role bypasses RLS

The Supabase `service_role` key runs as a superuser and **bypasses all RLS policies**, including those protecting the `api` views. Downstream modules MUST connect using the `anon` key (with a valid JWT) or the `authenticated` role. Never use `service_role` in application code that reads customer or vehicle data. Use it only for trusted server-side admin operations where the bypass is intentional and audited.

## Grants

```sql
GRANT USAGE ON SCHEMA api TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA api TO authenticated;
-- anon is explicitly excluded
```

## How to add a column to the contract

1. Write a new migration (e.g. `014_api_add_customer_field.sql`) that uses `CREATE OR REPLACE VIEW api.customers AS SELECT ..., new_column FROM public.customers`.
2. Open an ADR or append to this one documenting the addition and the downstream modules that depend on it.
3. Never remove or rename an existing `api` column without a deprecation migration and cross-repo audit.

## Alternatives Evaluated

| Option | Reason Rejected |
|---|---|
| Downstream reads `public.*` directly | Repeats ADR-002 incident on every schema change |
| PostgREST schema isolation per module | More infrastructure complexity; views achieve the same contract at zero added infra |
| GraphQL layer | Out of scope for Module 1; revisit at Module 5+ |

## Consequences

Positive: Internal `public` schema refactors (column renames, table splits, type changes) no longer break downstream modules. A single migration updates the view; consumers are unaffected.

Negative: The `api` views must be kept in sync when `public` columns they reference are dropped. Migration authors must check `api.*` view definitions before dropping any `public` column.

Risks: A developer connecting with `service_role` bypasses all protections — see WARNING above.

## Related

- ADR-002: `customers.id → customer_id` rename — the motivating incident for this contract layer.
