# ADR-002: Rename customers.id → customers.customer_id

| Field | Value |
|---|---|
| Date | 2026-05-20 |
| Status | Accepted |
| Supersedes | — |

## Context

The Quotation App (sibling module) uses the `customers` table with the column named `id`. Module 1 requires consistent naming — all primary keys follow the pattern `<table>_id` (e.g. `vehicles.vehicle_id`, `vehicle_documents.document_id`). The existing `customers.id` is inconsistent.

## Decision

Rename `customers.id` to `customers.customer_id` in migration 010. The FK constraint in `quotes` is dropped, the column renamed, and the FK restored.

## Cross-Repo Impact — CRITICAL

The **Quotation App** references `customers.id` directly. Before the Quotation App code is merged against a DB that has run migration 010, the Quotation App must run a find-replace:

```
customers.id  →  customers.customer_id
```

This is a **hard blocker** before deploying migration 010 to the shared production database.

## Alternatives Evaluated

| Option | Reason Rejected |
|---|---|
| Keep customers.id | Inconsistent with all other Module 1 tables |
| Rename in app layer only | Creates mismatch between DB schema and application code |

## Consequences

Positive: Consistent naming across all hub modules. Self-documenting FK relationships.

Negative: Breaking change for the Quotation App requiring coordinated deployment.

Risks: If migration 010 is applied before the Quotation App is updated, the Quotation App breaks on any query referencing `customers.id`.

## Review Trigger

Closed once Quotation App find-replace is merged and verified against staging.
