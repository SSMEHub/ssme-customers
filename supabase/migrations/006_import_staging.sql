CREATE TABLE import_staging (
  staging_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Raw fields exactly as received from Excel/PDF
  raw_customer_name     TEXT,
  raw_customer_code     TEXT,
  raw_ssm_or_ic         TEXT,
  raw_phone             TEXT,
  raw_address           TEXT,
  raw_email             TEXT,
  raw_plate             TEXT,
  raw_chassis           TEXT,
  raw_engine            TEXT,
  raw_maker             TEXT,
  raw_model             TEXT,
  raw_body_type         TEXT,
  raw_manufacture_yr    TEXT,
  raw_reg_date          TEXT,
  raw_gvw               TEXT,
  raw_kerb_weight       TEXT,
  raw_payload           TEXT,
  raw_doc_type          TEXT,
  raw_doc_number        TEXT,
  raw_issue_date        TEXT,
  raw_expiry_date       TEXT,

  -- Normalised fields written by the parser after cleaning
  normalized_plate      VARCHAR(20),
  normalized_phone      VARCHAR(30),
  normalized_ssm        VARCHAR(100),
  parsed_reg_date       DATE,
  parsed_manufacture_yr INT,
  parsed_gvw_kg         INT,

  -- Deduplication: set when parser finds an existing match
  duplicate_customer_id UUID REFERENCES customers(customer_id),
  duplicate_vehicle_id  UUID REFERENCES vehicles(vehicle_id),

  -- Import batch tracking
  import_batch          VARCHAR(255),  -- filename + timestamp, e.g. "Cust Listing 1.xlsx @ 2026-05-20T10:30"

  -- Source provenance
  source_file           VARCHAR(255),
  source_type           VARCHAR(10) CHECK (source_type IN ('excel','pdf','manual')),
  source_row            INT,

  -- Validation result
  valid_status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (valid_status IN ('pending','valid','error','duplicate','imported','skipped')),

  -- Structured errors — JSONB so we can query by error type
  -- e.g. [{"field":"plate","code":"invalid_format","raw":"XZU600R"},
  --        {"field":"reg_date","code":"unparseable","raw":"44635"}]
  error_log             JSONB,

  -- Promotion tracking
  mapped_customer_id    UUID REFERENCES customers(customer_id),
  mapped_vehicle_id     UUID REFERENCES vehicles(vehicle_id),
  imported_at           TIMESTAMPTZ,
  imported_by           UUID,  -- auth.users.id
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staging_valid_status  ON import_staging(valid_status);
CREATE INDEX idx_staging_source_file   ON import_staging(source_file);
CREATE INDEX idx_staging_import_batch  ON import_staging(import_batch);
CREATE INDEX idx_staging_normalized_plate ON import_staging(normalized_plate);
CREATE INDEX idx_staging_error_type    ON import_staging USING gin(error_log);
