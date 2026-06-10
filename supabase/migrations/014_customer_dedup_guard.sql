-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 014 — Customer Deduplication Guard
-- ─────────────────────────────────────────────────────────────────────────────
-- PURPOSE: Detection-only. Creates a view exposing duplicate customer clusters
--          so that a human reviewer can inspect and manually resolve them.
--          Nothing in this migration merges, updates, or deletes any customer
--          row. Merging is a SEPARATE, human-reviewed step performed AFTER
--          this view has been inspected and all clusters have been resolved.
--
-- SAFE TO RUN ON PRODUCTION: yes — only creates a view and leaves commented-out
--          index code that must be manually uncommented after dedup is complete.
-- IDEMPOTENT: yes — uses CREATE OR REPLACE VIEW.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — Duplicate-candidate view
-- ─────────────────────────────────────────────────────────────────────────────
-- Normalization rule applied inline (no stored function needed):
--   UPPER(REGEXP_REPLACE(COALESCE(id_number, ''), '[^A-Za-z0-9]', '', 'g'))
-- This strips all punctuation and whitespace (hyphens in SSM numbers, spaces
-- in IC numbers) and upper-cases the result so that, e.g.,
--   "200401234567" == "200401234567" and
--   "0123456-K" == "0123456K" == "0123456k"
-- Rows where id_number is NULL or blank after normalisation are excluded
-- because an empty identifier cannot reliably identify a duplicate.

CREATE OR REPLACE VIEW customer_dup_candidates AS
SELECT
    -- The canonical form used for matching
    UPPER(REGEXP_REPLACE(COALESCE(id_number, ''), '[^A-Za-z0-9]', '', 'g'))
        AS normalized_id,

    -- id_type lets the reviewer know whether this is an SSM reg or NRIC;
    -- a cluster where types differ (e.g. one row 'ssm', another 'other') is
    -- a data-quality signal worth flagging.
    id_type,

    -- How many customer rows share this normalized id
    COUNT(*) AS dup_count,

    -- Full cluster detail as a JSON array so a single row captures all
    -- members. Each element: {customer_id, company_name, customer_code,
    -- status, created_at}  — enough to decide which record to keep.
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'customer_id',   customer_id,
            'company_name',  company_name,
            'customer_code', customer_code,
            'status',        status,
            'created_at',    created_at
        )
        ORDER BY created_at ASC   -- oldest first = likely the canonical record
    ) AS cluster_members

FROM customers

WHERE
    -- Exclude rows with no usable identifier
    id_number IS NOT NULL
    AND TRIM(id_number) <> ''

GROUP BY
    UPPER(REGEXP_REPLACE(COALESCE(id_number, ''), '[^A-Za-z0-9]', '', 'g')),
    id_type

HAVING COUNT(*) > 1

ORDER BY COUNT(*) DESC, normalized_id;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — Forward-looking uniqueness guard  ⚠ COMMENTED OUT ⚠
-- ─────────────────────────────────────────────────────────────────────────────
-- DO NOT UNCOMMENT until every cluster in customer_dup_candidates has been
-- resolved (merged or explained).  If any duplicate rows still exist when this
-- index is created it will FAIL with a "could not create unique index" error
-- and block the migration entirely.
--
-- Once all duplicates are resolved, uncomment and re-run this file (or apply
-- it as migration 015 to keep a clean audit trail).
--
-- The partial index covers only rows where the id is meaningful (ssm or ic)
-- and non-empty, matching the same population as the view above.
-- ─────────────────────────────────────────────────────────────────────────────

-- APPLY ONLY AFTER DUPLICATES ARE MERGED — WILL FAIL IF DUPES EXIST
-- CREATE UNIQUE INDEX IF NOT EXISTS uidx_customers_normalized_id
--   ON customers (
--     UPPER(REGEXP_REPLACE(COALESCE(id_number, ''), '[^A-Za-z0-9]', '', 'g'))
--   )
--   WHERE
--     id_type IN ('ssm', 'ic')
--     AND id_number IS NOT NULL
--     AND TRIM(id_number) <> '';
