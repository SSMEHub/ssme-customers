-- Module 1 Full Schema
-- Expands the existing Quotation App DB to include Module 1 Customer & Fleet tables.
-- Safe to run against live DB: ALTERs existing tables, CREATEs new ones.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CUSTOMERS — expand existing Quotation App table
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. Rename customers.id → customer_id (consistent with Module 1 schema)
--     Drop quotes FK first, rename, then restore FK.
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_customer_id_fkey;
ALTER TABLE customers RENAME COLUMN id TO customer_id;
ALTER TABLE quotes
  ADD CONSTRAINT quotes_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT;

-- 1b. Add Module 1 columns
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_code     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS entity_type       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS id_number         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS id_type           VARCHAR(10) DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS address_line1     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_line2     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS postcode          VARCHAR(10),
  ADD COLUMN IF NOT EXISTS city              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state             VARCHAR(100) DEFAULT 'Kelantan',
  ADD COLUMN IF NOT EXISTS contact_person    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS notes             TEXT,
  ADD COLUMN IF NOT EXISTS status            VARCHAR(20) DEFAULT 'active';

-- 1c. Migrate existing Quotation App data into new columns
UPDATE customers SET
  entity_type    = CASE
                     WHEN customer_type IN ('sdn_bhd','enterprise','individual','cooperative','gov_agency','other') THEN customer_type
                     ELSE 'other'
                   END,
  id_number      = NULLIF(TRIM(ic_or_reg), ''),
  address_line1  = NULLIF(TRIM(address), ''),
  contact_person = NULLIF(TRIM(attention_to), '');

-- 1d. Set NOT NULL and CHECK now that all rows have values
ALTER TABLE customers
  ALTER COLUMN entity_type SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_entity_type_check,
  DROP CONSTRAINT IF EXISTS customers_id_type_check,
  DROP CONSTRAINT IF EXISTS customers_status_check,
  DROP CONSTRAINT IF EXISTS customers_customer_code_key;

ALTER TABLE customers
  ADD CONSTRAINT customers_entity_type_check
    CHECK (entity_type IN ('sdn_bhd','enterprise','individual','cooperative','gov_agency','other')),
  ADD CONSTRAINT customers_id_type_check
    CHECK (id_type IN ('ssm','ic','other')),
  ADD CONSTRAINT customers_status_check
    CHECK (status IN ('active','inactive','rejected')),
  ADD CONSTRAINT customers_customer_code_key
    UNIQUE (customer_code);

-- 1e. updated_at trigger (Quotation App may already have one; create if not)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'customers_updated_at' AND tgrelid = 'customers'::regclass
  ) THEN
    CREATE TRIGGER customers_updated_at
      BEFORE UPDATE ON customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- 1f. Indexes
CREATE INDEX IF NOT EXISTS idx_customers_company_name
  ON customers USING gin(to_tsvector('simple', company_name));
CREATE INDEX IF NOT EXISTS idx_customers_id_number    ON customers(id_number);
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. VEHICLE MODELS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_models (
  model_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maker         VARCHAR(100) NOT NULL,
  model_code    VARCHAR(100) NOT NULL,
  series        VARCHAR(100),
  gvw_class     VARCHAR(50),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (maker, model_code)
);

-- Seed HINO models
INSERT INTO vehicle_models (maker, model_code, series, gvw_class) VALUES
  ('HINO', '300 Series', '300', 'light'),
  ('HINO', '500 Series FC', '500', 'medium'),
  ('HINO', '500 Series FG', '500', 'medium'),
  ('HINO', '700 Series SS', '700', 'heavy'),
  ('HINO', '700 Series FS', '700', 'heavy'),
  ('HINO', '700 Series FY', '700', 'heavy'),
  ('HINO', 'WU Series', 'WU', 'light'),
  ('HINO', 'XZU Series', 'XZU', 'light')
ON CONFLICT (maker, model_code) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. VEHICLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID NOT NULL REFERENCES customers(customer_id),
  original_customer_id  UUID REFERENCES customers(customer_id),
  plate_number          VARCHAR(20) UNIQUE NOT NULL,
  chassis_no            VARCHAR(100) UNIQUE NOT NULL,
  engine_no             VARCHAR(100) UNIQUE NOT NULL,
  model_id              UUID REFERENCES vehicle_models(model_id),
  maker                 VARCHAR(100) NOT NULL,
  model_code            VARCHAR(100) NOT NULL,
  body_type             VARCHAR(100),
  colour                VARCHAR(50),
  gvw_kg                INT,
  kerb_weight_kg        INT,
  payload_kg            INT,
  engine_capacity       INT,
  fuel_type             VARCHAR(50),
  usage_class           VARCHAR(100),
  assembly_type         VARCHAR(10) CHECK (assembly_type IN ('CKD','CBU')),
  manufacture_yr        INT,
  reg_date              DATE,
  delivery_date         DATE,
  completion_date       DATE,
  body_builder          VARCHAR(255),
  sql_account_code      VARCHAR(20),
  loan_bank             VARCHAR(255),
  loan_tenure_months    INT,
  last_mileage_km       INT,
  last_mileage_date     DATE,
  status                VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','in_shop','decommissioned','scrapped')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gvw_gt_kerb CHECK (
    gvw_kg IS NULL OR kerb_weight_kg IS NULL OR gvw_kg > kerb_weight_kg
  )
);

CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id  ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_chassis_no   ON vehicles(chassis_no);
CREATE INDEX IF NOT EXISTS idx_vehicles_status       ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_reg_date     ON vehicles(reg_date);

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VEHICLE DOCUMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_documents (
  document_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id     UUID NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
  doc_type       VARCHAR(50) NOT NULL
                 CHECK (doc_type IN (
                   'geran','insurance','road_tax','puspakom',
                   'sld','permit_apad','permit_lpkp',
                   'report_awalan','invoice_sales','invoice_service','plan','other'
                 )),
  doc_number     VARCHAR(100),
  issue_date     DATE,
  expiry_date    DATE,
  emission_val   DECIMAL(5,2),
  brake_eff_pct  DECIMAL(5,2),
  gps_sirim_no   VARCHAR(100),
  sld_calib_date DATE,
  file_url       TEXT,
  notes          TEXT,
  uploaded_by    UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_vehicle_id  ON vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_docs_doc_type    ON vehicle_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_docs_expiry_date ON vehicle_documents(expiry_date);

CREATE TRIGGER vehicle_documents_updated_at
  BEFORE UPDATE ON vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. OWNERSHIP TRANSFERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ownership_transfers (
  transfer_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id     UUID NOT NULL REFERENCES vehicles(vehicle_id),
  seller_id      UUID NOT NULL REFERENCES customers(customer_id),
  buyer_id       UUID NOT NULL REFERENCES customers(customer_id),
  transfer_date  DATE NOT NULL,
  b5_cert_no     VARCHAR(100),
  b5_expiry      DATE GENERATED ALWAYS AS (transfer_date + INTERVAL '30 days') STORED,
  bank_release   VARCHAR(100),
  special_case   VARCHAR(50)
                 CHECK (special_case IN ('deceased','abroad','dissolved_corp','missing_owner',NULL)),
  probate_ref    VARCHAR(100),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update vehicle.customer_id when transfer is recorded
CREATE OR REPLACE FUNCTION apply_ownership_transfer()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vehicles SET
    customer_id = NEW.buyer_id,
    original_customer_id = COALESCE(original_customer_id, NEW.seller_id),
    updated_at = NOW()
  WHERE vehicle_id = NEW.vehicle_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ownership_transfer_apply
  AFTER INSERT ON ownership_transfers
  FOR EACH ROW EXECUTE FUNCTION apply_ownership_transfer();


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. IMPORT STAGING
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS import_staging (
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
  normalized_plate      VARCHAR(20),
  normalized_phone      VARCHAR(30),
  normalized_ssm        VARCHAR(100),
  parsed_reg_date       DATE,
  parsed_manufacture_yr INT,
  parsed_gvw_kg         INT,
  duplicate_customer_id UUID REFERENCES customers(customer_id),
  duplicate_vehicle_id  UUID REFERENCES vehicles(vehicle_id),
  import_batch          VARCHAR(255),
  source_file           VARCHAR(255),
  source_type           VARCHAR(10) CHECK (source_type IN ('excel','pdf','manual')),
  source_row            INT,
  valid_status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (valid_status IN ('pending','valid','error','duplicate','imported','skipped')),
  error_log             JSONB,
  mapped_customer_id    UUID REFERENCES customers(customer_id),
  mapped_vehicle_id     UUID REFERENCES vehicles(vehicle_id),
  imported_at           TIMESTAMPTZ,
  imported_by           UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staging_valid_status    ON import_staging(valid_status);
CREATE INDEX IF NOT EXISTS idx_staging_source_file     ON import_staging(source_file);
CREATE INDEX IF NOT EXISTS idx_staging_import_batch    ON import_staging(import_batch);
CREATE INDEX IF NOT EXISTS idx_staging_normalized_plate ON import_staging(normalized_plate);
CREATE INDEX IF NOT EXISTS idx_staging_error_type      ON import_staging USING gin(error_log);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt()->'user_metadata'->>'role',
    auth.jwt()->'app_metadata'->>'role'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_models     ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_staging     ENABLE ROW LEVEL SECURITY;

-- Customers: admin/finance/sales = full | workshop = read only
DROP POLICY IF EXISTS "customers_rw" ON customers;
DROP POLICY IF EXISTS "customers_ro_workshop" ON customers;
CREATE POLICY "customers_rw" ON customers FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','finance','sales'))
  WITH CHECK (get_user_role() IN ('admin','finance','sales'));
CREATE POLICY "customers_ro_workshop" ON customers FOR SELECT TO authenticated
  USING (get_user_role() = 'workshop');

-- Vehicles: all read | admin/sales write
DROP POLICY IF EXISTS "vehicles_ro" ON vehicles;
DROP POLICY IF EXISTS "vehicles_rw" ON vehicles;
CREATE POLICY "vehicles_ro" ON vehicles FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin','finance','sales','workshop'));
CREATE POLICY "vehicles_rw" ON vehicles FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','sales'))
  WITH CHECK (get_user_role() IN ('admin','sales'));

-- Vehicle documents: all read | admin/finance/sales write
DROP POLICY IF EXISTS "docs_ro" ON vehicle_documents;
DROP POLICY IF EXISTS "docs_rw" ON vehicle_documents;
CREATE POLICY "docs_ro" ON vehicle_documents FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin','finance','sales','workshop'));
CREATE POLICY "docs_rw" ON vehicle_documents FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','finance','sales'))
  WITH CHECK (get_user_role() IN ('admin','finance','sales'));

-- Ownership transfers: admin/finance/sales only
DROP POLICY IF EXISTS "transfers_rw" ON ownership_transfers;
CREATE POLICY "transfers_rw" ON ownership_transfers FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','finance','sales'))
  WITH CHECK (get_user_role() IN ('admin','finance','sales'));

-- Vehicle models: all read | admin write
DROP POLICY IF EXISTS "models_ro" ON vehicle_models;
DROP POLICY IF EXISTS "models_rw" ON vehicle_models;
CREATE POLICY "models_ro" ON vehicle_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "models_rw" ON vehicle_models FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Import staging: admin only
DROP POLICY IF EXISTS "staging_admin" ON import_staging;
CREATE POLICY "staging_admin" ON import_staging FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW fleet_age_view AS
SELECT
  v.vehicle_id,
  v.plate_number,
  v.chassis_no,
  v.maker,
  v.model_code,
  v.body_type,
  v.colour,
  v.manufacture_yr,
  v.reg_date,
  v.last_mileage_km,
  v.status,
  c.customer_id,
  c.company_name,
  c.phone,
  c.state,
  CASE
    WHEN v.assembly_type = 'CBU'
      THEN (DATE_PART('year', NOW()) - v.manufacture_yr)::INT
    ELSE DATE_PART('year', AGE(NOW(), v.reg_date))::INT
  END AS age_years,
  LEAST(100, GREATEST(0,
    CASE
      WHEN v.assembly_type = 'CBU'
        THEN ((DATE_PART('year', NOW()) - v.manufacture_yr) * 10)::INT
      ELSE (DATE_PART('year', AGE(NOW(), v.reg_date)) * 10)::INT
    END
  )) AS rri,
  CASE
    WHEN (
      CASE
        WHEN v.assembly_type = 'CBU'
          THEN (DATE_PART('year', NOW()) - v.manufacture_yr)::INT
        ELSE DATE_PART('year', AGE(NOW(), v.reg_date))::INT
      END
    ) >= 7 THEN TRUE ELSE FALSE
  END AS replacement_due
FROM vehicles v
JOIN customers c ON v.customer_id = c.customer_id
WHERE v.status = 'active';

CREATE OR REPLACE VIEW expiry_alerts_view AS
SELECT
  vd.document_id,
  vd.vehicle_id,
  v.plate_number,
  v.maker,
  v.model_code,
  c.customer_id,
  c.company_name,
  c.phone,
  vd.doc_type,
  vd.doc_number,
  vd.expiry_date,
  (vd.expiry_date - CURRENT_DATE)::INT AS days_until_expiry,
  CASE
    WHEN vd.expiry_date < CURRENT_DATE             THEN 'expired'
    WHEN vd.expiry_date <= CURRENT_DATE + 30       THEN 'critical'
    WHEN vd.expiry_date <= CURRENT_DATE + 60       THEN 'warning'
  END AS alert_level
FROM vehicle_documents vd
JOIN vehicles v ON vd.vehicle_id = v.vehicle_id
JOIN customers c ON v.customer_id = c.customer_id
WHERE vd.expiry_date IS NOT NULL
  AND vd.expiry_date <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY vd.expiry_date ASC;
