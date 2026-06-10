-- ─────────────────────────────────────────────────────────────────────────────
-- dedup-report.sql — Duplicate Customer Cluster Report
-- ─────────────────────────────────────────────────────────────────────────────
-- PURPOSE : Detection only. Lists every cluster of customers sharing the same
--           normalised SSM/IC identifier so an admin can decide which record
--           to keep and which to retire (flag status = 'inactive').
--           This file performs NO merges, updates, or deletes.
--
-- PRE-REQUISITE : Migration 014_customer_dedup_guard.sql must have been applied
--                 (it creates the customer_dup_candidates view).
--
-- HOW TO RUN:
--   Option A — Supabase SQL Editor (recommended for one-off review):
--     1. Open https://supabase.com/dashboard/project/gruvcmbsvoauhftfcoio/sql/new
--     2. Paste the SELECT below and click "Run".
--
--   Option B — psql / CLI:
--     psql "$DATABASE_URL" -f scripts/dedup-report.sql
--
--   Option C — Supabase CLI:
--     supabase db execute --file scripts/dedup-report.sql
--
-- OUTPUT COLUMNS:
--   normalized_id    — the stripped, upper-cased identifier used for matching
--   id_type          — 'ssm', 'ic', or 'other'
--   dup_count        — number of customer rows sharing this identifier
--   cluster_members  — JSON array; each element contains:
--                        customer_id, company_name, customer_code,
--                        status, created_at
--                      Ordered oldest-first — the oldest record is likely the
--                      canonical one to keep.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    normalized_id,
    id_type,
    dup_count,
    cluster_members
FROM customer_dup_candidates
ORDER BY dup_count DESC, normalized_id ASC;
