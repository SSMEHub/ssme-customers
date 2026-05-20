CREATE TABLE import_staging (
  staging_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  source_file           VARCHAR(255),
  source_type           VARCHAR(10) CHECK (source_type IN ('excel','pdf','manual')),
  source_row            INT,
  valid_status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (valid_status IN ('pending','valid','error','imported')),
  error_log             TEXT,
  mapped_customer_id    UUID REFERENCES customers(customer_id),
  mapped_vehicle_id     UUID REFERENCES vehicles(vehicle_id),
  imported_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staging_valid_status ON import_staging(valid_status);
CREATE INDEX idx_staging_source_file ON import_staging(source_file);
