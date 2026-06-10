-- Migration 013 — API Contract Schema
-- Additive, non-breaking, safe to run on live DB.
-- Creates a stable `api` schema of views so downstream modules (Quotation App,
-- Sales, future modules) consume a versioned column contract instead of raw
-- public tables. Internal column renames never break consumers again.
--
-- Requires: Postgres 15+ (security_invoker view option).
-- RLS: WITH (security_invoker = true) means the base-table RLS policies on
--      public.customers / public.vehicles / public.vehicle_documents are
--      evaluated against the CALLING user's JWT — not the view definer.
--      The api schema itself has no additional policies; the public RLS is
--      the single source of truth.
-- Idempotent: CREATE SCHEMA IF NOT EXISTS + CREATE OR REPLACE VIEW.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS api;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. api.customers
--
-- Stable contract for the customers entity.
-- Maps:  public.customers.company_name → name   (natural name for consumers)
-- Omits: internal columns (address_line1/2, postcode, notes, created_at,
--        updated_at, sql_account_code) — consumers needing them must request
--        a new api column via an ADR, not by reading public directly.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW api.customers
WITH (security_invoker = true)
AS
SELECT
  customer_id,
  customer_code,
  company_name   AS name,
  entity_type,
  id_type,
  id_number,
  phone,
  contact_person,
  city,
  state,
  status
FROM public.customers;

COMMENT ON VIEW api.customers IS
  'Stable contract for downstream modules. Maps company_name → name. '
  'RLS enforced via security_invoker: admin/finance/sales read-write; workshop read-only.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. api.vehicles
--
-- Stable contract for the vehicles entity.
-- Omits: internal/operational columns (engine_no, colour, gvw_kg, kerb_weight_kg,
--        payload_kg, loan_bank, last_mileage_km, notes, etc.) that are unlikely
--        to be needed by downstream integrations.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW api.vehicles
WITH (security_invoker = true)
AS
SELECT
  vehicle_id,
  customer_id,
  plate_number,
  chassis_no,
  maker,
  model_code,
  body_type,
  status,
  reg_date
FROM public.vehicles;

COMMENT ON VIEW api.vehicles IS
  'Stable contract for downstream modules. '
  'RLS enforced via security_invoker: all roles read; admin/sales write.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. api.vehicle_documents
--
-- Stable contract for vehicle documents.
-- Omits: internal audit/inspection columns (emission_val, brake_eff_pct,
--        gps_sirim_no, sld_calib_date, notes, uploaded_by, timestamps).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW api.vehicle_documents
WITH (security_invoker = true)
AS
SELECT
  document_id,
  vehicle_id,
  doc_type,
  doc_number,
  expiry_date,
  file_url
FROM public.vehicle_documents;

COMMENT ON VIEW api.vehicle_documents IS
  'Stable contract for downstream modules. '
  'RLS enforced via security_invoker: all roles read; admin/finance/sales write.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. api.expiry_alerts
--
-- Re-exposes public.expiry_alerts_view through the api schema.
-- Downstream modules (e.g. reminders, notifications) consume this instead of
-- reaching into public directly.
-- security_invoker cascades through to the underlying public table RLS.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW api.expiry_alerts
WITH (security_invoker = true)
AS
SELECT
  document_id,
  vehicle_id,
  plate_number,
  maker,
  model_code,
  customer_id,
  company_name,
  phone,
  doc_type,
  doc_number,
  expiry_date,
  days_until_expiry,
  alert_level
FROM public.expiry_alerts_view;

COMMENT ON VIEW api.expiry_alerts IS
  'Stable contract re-exposing public.expiry_alerts_view. '
  'Returns only documents expiring within 60 days or already expired. '
  'alert_level: expired | critical (≤30 days) | warning (≤60 days).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. GRANTS
--
-- Only the `authenticated` role gets access to the api schema.
-- `anon` is deliberately excluded — no unauthenticated reads.
-- No grants are made to the underlying public tables here; those are
-- controlled by the RLS policies in migration 010.
-- DEFAULT PRIVILEGES covers views created in future api migrations.
-- ─────────────────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA api TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA api TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT SELECT ON TABLES TO authenticated;
