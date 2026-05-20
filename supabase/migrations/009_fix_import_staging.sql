-- Upgrade import_staging to robust schema for 10-year SQL Accounting data import
-- Adds: JSONB error_log, normalised output columns, dedup refs, batch tracking, audit

-- Convert error_log from TEXT to JSONB
ALTER TABLE import_staging
  ALTER COLUMN error_log TYPE JSONB USING
    CASE
      WHEN error_log IS NULL THEN NULL
      WHEN error_log = '' THEN NULL
      ELSE jsonb_build_array(jsonb_build_object('legacy_text', error_log))
    END;

-- Add normalised output columns (parser writes these after cleaning raw input)
ALTER TABLE import_staging
  ADD COLUMN IF NOT EXISTS normalized_plate      VARCHAR(20),
  ADD COLUMN IF NOT EXISTS normalized_phone      VARCHAR(30),
  ADD COLUMN IF NOT EXISTS normalized_ssm        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS parsed_reg_date       DATE,
  ADD COLUMN IF NOT EXISTS parsed_manufacture_yr INT,
  ADD COLUMN IF NOT EXISTS parsed_gvw_kg         INT;

-- Deduplication: parser sets these when a matching record already exists in DB
ALTER TABLE import_staging
  ADD COLUMN IF NOT EXISTS duplicate_customer_id UUID REFERENCES customers(customer_id),
  ADD COLUMN IF NOT EXISTS duplicate_vehicle_id  UUID REFERENCES vehicles(vehicle_id);

-- Batch tracking: filename + timestamp so you can review one upload at a time
ALTER TABLE import_staging
  ADD COLUMN IF NOT EXISTS import_batch VARCHAR(255);

-- Audit: who approved and promoted this row
ALTER TABLE import_staging
  ADD COLUMN IF NOT EXISTS imported_by UUID;

-- Extend valid_status to include duplicate and skipped states
ALTER TABLE import_staging
  DROP CONSTRAINT IF EXISTS import_staging_valid_status_check;

ALTER TABLE import_staging
  ADD CONSTRAINT import_staging_valid_status_check
  CHECK (valid_status IN ('pending','valid','error','duplicate','imported','skipped'));

-- Indexes for parser and review UI queries
CREATE INDEX IF NOT EXISTS idx_staging_import_batch    ON import_staging(import_batch);
CREATE INDEX IF NOT EXISTS idx_staging_normalized_plate ON import_staging(normalized_plate);
CREATE INDEX IF NOT EXISTS idx_staging_error_type      ON import_staging USING gin(error_log);
