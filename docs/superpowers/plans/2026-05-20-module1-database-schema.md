# Module 1 — Customer & Fleet Database Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the complete Supabase PostgreSQL schema for SSME's Customer & Fleet Database — all tables, RLS policies, views, and the JS client layer.

**Architecture:** PostgreSQL on Supabase (project: gruvcmbsvoauhftfcoio). All tables use UUID primary keys. Row Level Security enforces 4 roles (admin, finance, sales, workshop) at DB level. A staging table receives all raw Excel/PDF imports before validation and promotion to production tables.

**Tech Stack:** Supabase (PostgreSQL), @supabase/supabase-js, React + Vite + Tailwind CSS, Cloudflare Workers (deploy target)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/001_customers.sql` | Create | Customer master table + trigger |
| `supabase/migrations/002_vehicle_models.sql` | Create | Static HINO model catalog |
| `supabase/migrations/003_vehicles.sql` | Create | Per-unit vehicle registry |
| `supabase/migrations/004_vehicle_documents.sql` | Create | Geran, insurance, puspakom, etc. |
| `supabase/migrations/005_ownership_transfers.sql` | Create | Transfer history + compliance gate |
| `supabase/migrations/006_import_staging.sql` | Create | Raw import landing zone |
| `supabase/migrations/007_rls_policies.sql` | Create | All RLS policies for 4 roles |
| `supabase/migrations/008_views.sql` | Create | Fleet age RRI view + expiry alerts view |
| `supabase/seed.sql` | Create | Test data (3 customers, 6 vehicles, documents) |
| `src/lib/supabase.js` | Create | Supabase client singleton |
| `src/lib/db/customers.js` | Create | Customer CRUD functions |
| `src/lib/db/vehicles.js` | Create | Vehicle CRUD + fleet age query |
| `src/lib/db/documents.js` | Create | Document upload + expiry alerts |

---

## Task 1: Install Supabase client

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
cd "/Users/teckchuan/HINO SSKB/SSME CUSTOMERS"
npm install @supabase/supabase-js
```

Expected output: `added 1 package` (or similar)

- [ ] **Step 2: Verify it installed**

```bash
node -e "require('./node_modules/@supabase/supabase-js')" && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @supabase/supabase-js"
```

---

## Task 2: Create Supabase client singleton

**Files:**
- Create: `src/lib/supabase.js`

- [ ] **Step 1: Create the file**

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Verify env vars exist**

```bash
grep -c "VITE_SUPABASE" "/Users/teckchuan/HINO SSKB/SSME CUSTOMERS/.env.local"
```

Expected: `2`

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.js
git commit -m "feat: add Supabase client singleton"
```

---

## Task 3: Migration 001 — customers table

**Files:**
- Create: `supabase/migrations/001_customers.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/001_customers.sql

-- Shared updated_at trigger function (reused by all tables)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE customers (
  customer_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code     VARCHAR(20) UNIQUE,          -- SQL Accounting code e.g. "300-A0004"
  company_name      VARCHAR(255) NOT NULL,
  entity_type       VARCHAR(50) NOT NULL
                    CHECK (entity_type IN ('sdn_bhd','enterprise','individual','cooperative','gov_agency','other')),
  id_number         VARCHAR(100),                -- SSM reg (company) or IC number (individual)
  id_type           VARCHAR(10)
                    CHECK (id_type IN ('ssm','ic','other')),
  phone             VARCHAR(50),
  email             VARCHAR(100),
  address_line1     VARCHAR(255),
  address_line2     VARCHAR(255),
  postcode          VARCHAR(10),
  city              VARCHAR(100),
  state             VARCHAR(100)                 DEFAULT 'Kelantan',
  contact_person    VARCHAR(255),                -- primary contact name
  notes             TEXT,
  status            VARCHAR(20) NOT NULL         DEFAULT 'active'
                    CHECK (status IN ('active','inactive','rejected')),
  created_at        TIMESTAMPTZ NOT NULL         DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL         DEFAULT NOW()
);

CREATE INDEX idx_customers_company_name ON customers USING gin(to_tsvector('simple', company_name));
CREATE INDEX idx_customers_id_number ON customers (id_number);
CREATE INDEX idx_customers_customer_code ON customers (customer_code);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Run in Supabase SQL editor**

Open: https://supabase.com/dashboard/project/gruvcmbsvoauhftfcoio/sql/new

Paste the full SQL above and click **Run**.

Expected: `Success. No rows returned`

- [ ] **Step 3: Verify table exists**

Run in SQL editor:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;
```

Expected: 16 rows, all columns present.

- [ ] **Step 4: Commit migration file**

```bash
mkdir -p "/Users/teckchuan/HINO SSKB/SSME CUSTOMERS/supabase/migrations"
git add supabase/migrations/001_customers.sql
git commit -m "feat: add customers table migration"
```

---

## Task 4: Migration 002 — vehicle_models table

**Files:**
- Create: `supabase/migrations/002_vehicle_models.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/002_vehicle_models.sql

CREATE TABLE vehicle_models (
  model_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maker             VARCHAR(100) NOT NULL,        -- HINO, ISUZU, FUSO
  model_code        VARCHAR(100) NOT NULL,        -- XZU710R, XZC730R, WU710R
  description       VARCHAR(255),                -- e.g. "300 Series Medium Duty"
  engine_capacity   INT,                          -- cc e.g. 4009
  fuel_type         VARCHAR(50),                  -- DISEL HIJAU, petrol
  gvw_kg            INT,                          -- Gross Vehicle Weight in kg
  usage_class       VARCHAR(100),                 -- BRG-RIGID DECON 950-7500KG
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(maker, model_code)
);

-- Seed common HINO models
INSERT INTO vehicle_models (maker, model_code, description, engine_capacity, fuel_type, gvw_kg) VALUES
  ('HINO', 'WU302R',  '300 Series Light Duty',   4009, 'DISEL HIJAU', 3500),
  ('HINO', 'WU710R',  '300 Series Medium Duty',  4009, 'DISEL HIJAU', 7500),
  ('HINO', 'WU720R',  '300 Series Medium Duty',  4009, 'DISEL HIJAU', 7500),
  ('HINO', 'XZC710R', '500 Series Medium Duty',  7684, 'DISEL HIJAU', 12500),
  ('HINO', 'XZC730R', '500 Series Medium Duty',  7684, 'DISEL HIJAU', 14000),
  ('HINO', 'XZU600K', '300 Series Light Duty',   4009, 'DISEL HIJAU', 6000),
  ('HINO', 'XZU600R', '300 Series Light Duty',   4009, 'DISEL HIJAU', 6000),
  ('HINO', 'XZU710R', '300 Series Medium Duty',  4009, 'DISEL HIJAU', 7500);
```

- [ ] **Step 2: Run in Supabase SQL editor and verify**

```sql
SELECT maker, model_code, gvw_kg FROM vehicle_models ORDER BY model_code;
```

Expected: 8 HINO model rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_vehicle_models.sql
git commit -m "feat: add vehicle_models table with HINO seed data"
```

---

## Task 5: Migration 003 — vehicles table

**Files:**
- Create: `supabase/migrations/003_vehicles.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/003_vehicles.sql

CREATE TABLE vehicles (
  vehicle_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID NOT NULL REFERENCES customers(customer_id),
  original_customer_id UUID REFERENCES customers(customer_id),  -- first ever buyer

  -- JPJ registration (from Geran / Sijil Pemilikan Kenderaan)
  plate_number        VARCHAR(20) UNIQUE NOT NULL,
  chassis_no          VARCHAR(100) UNIQUE NOT NULL,
  engine_no           VARCHAR(100) UNIQUE NOT NULL,

  -- Model (can link to vehicle_models or store directly for non-catalog models)
  model_id            UUID REFERENCES vehicle_models(model_id),
  maker               VARCHAR(100) NOT NULL,
  model_code          VARCHAR(100) NOT NULL,
  body_type           VARCHAR(100),        -- LORI RIGID, KARGO AM, HASIL PERTANIAN, TIPPER
  colour              VARCHAR(50),

  -- Physical specs (from JPJ cert BDM/BGK/BTM fields)
  gvw_kg              INT,                 -- BDM (Berat Dibenarkan Maksimum)
  kerb_weight_kg      INT,                 -- BGK
  payload_kg          INT,                 -- BTM
  engine_capacity     INT,                 -- cc
  fuel_type           VARCHAR(50),
  usage_class         VARCHAR(100),        -- BRG-RIGID DECON 950-7500KG
  assembly_type       VARCHAR(10)
                      CHECK (assembly_type IN ('CKD','CBU')),

  -- Dates
  manufacture_yr      INT,
  reg_date            DATE,                -- Tarikh Pendaftaran from JPJ
  delivery_date       DATE,                -- date customer received truck from SSME
  completion_date     DATE,                -- date body builder finished

  -- SSME internal
  body_builder        VARCHAR(255),
  sql_account_code    VARCHAR(20),         -- SQL Accounting account code e.g. 300-A0404
  loan_bank           VARCHAR(255),
  loan_tenure_months  INT,

  -- Mileage (updated each workshop visit)
  last_mileage_km     INT,
  last_mileage_date   DATE,

  status              VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','in_shop','decommissioned','scrapped')),

  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT gvw_gt_kerb CHECK (
    gvw_kg IS NULL OR kerb_weight_kg IS NULL OR gvw_kg > kerb_weight_kg
  )
);

CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX idx_vehicles_chassis_no ON vehicles(chassis_no);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_reg_date ON vehicles(reg_date);

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Run and verify**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicles'
ORDER BY ordinal_position;
```

Expected: 31 columns present.

- [ ] **Step 3: Test GVW constraint**

```sql
-- This should FAIL
INSERT INTO vehicles (customer_id, plate_number, chassis_no, engine_no, maker, model_code, gvw_kg, kerb_weight_kg)
VALUES (
  (SELECT customer_id FROM customers LIMIT 1),
  'TEST001', 'CHS001', 'ENG001', 'HINO', 'XZU710R', 5000, 6000
);
```

Expected: `ERROR: new row violates check constraint "gvw_gt_kerb"`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/003_vehicles.sql
git commit -m "feat: add vehicles table migration with JPJ fields"
```

---

## Task 6: Migration 004 — vehicle_documents table

**Files:**
- Create: `supabase/migrations/004_vehicle_documents.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/004_vehicle_documents.sql

CREATE TABLE vehicle_documents (
  document_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        UUID NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,

  doc_type          VARCHAR(50) NOT NULL
                    CHECK (doc_type IN (
                      'geran','insurance','puspakom','road_tax',
                      'sld','permit_apad','permit_lpkp',
                      'invoice_sales','invoice_service',
                      'report_awalan','plan','other'
                    )),

  doc_number        VARCHAR(100),
  issue_date        DATE,
  expiry_date       DATE,

  -- Puspakom-specific fields
  emission_val      DECIMAL(5,2),      -- smoke opacity % (pass: ≤ 50%)
  brake_eff_pct     DECIMAL(5,2),      -- brake efficiency % (pass: ≥ 50%)
  pass_fail         VARCHAR(15)
                    CHECK (pass_fail IN ('pass','fail','conditional')),

  -- GPS / SLD
  gps_sirim_no      VARCHAR(100),
  sld_calib_date    DATE,

  -- Uploaded file
  file_url          TEXT,              -- Supabase Storage URL
  file_name         VARCHAR(255),
  file_size_bytes   INT,

  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docs_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX idx_docs_doc_type ON vehicle_documents(doc_type);
CREATE INDEX idx_docs_expiry_date ON vehicle_documents(expiry_date)
  WHERE expiry_date IS NOT NULL;
```

- [ ] **Step 2: Run and verify**

```sql
SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'vehicle_documents';
```

Expected: `15`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_vehicle_documents.sql
git commit -m "feat: add vehicle_documents table migration"
```

---

## Task 7: Migration 005 — ownership_transfers table

**Files:**
- Create: `supabase/migrations/005_ownership_transfers.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/005_ownership_transfers.sql

CREATE TABLE ownership_transfers (
  transfer_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          UUID NOT NULL REFERENCES vehicles(vehicle_id),
  seller_id           UUID NOT NULL REFERENCES customers(customer_id),
  buyer_id            UUID NOT NULL REFERENCES customers(customer_id),
  transfer_date       DATE NOT NULL,

  -- Malaysian JPJ compliance
  b5_cert_no          VARCHAR(100) NOT NULL,   -- PUSPAKOM B5 Transfer Inspection cert
  b5_inspection_date  DATE NOT NULL,           -- must be within 30 days of transfer_date
  bank_release_ref    VARCHAR(100),            -- JPJ e-Hakmilik bank release letter ref

  -- Special transfer cases
  special_case        VARCHAR(30)
                      CHECK (special_case IN ('deceased','abroad','dissolved_corp','missing_owner')),
  probate_ref         VARCHAR(100),            -- Letter of Administration or Faraid cert

  transfer_price      DECIMAL(12,2),           -- sale price in MYR
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- B5 cert must be used within 30 days of inspection
  CONSTRAINT b5_within_validity CHECK (
    transfer_date <= b5_inspection_date + INTERVAL '30 days'
  )
);

CREATE INDEX idx_transfers_vehicle_id ON ownership_transfers(vehicle_id);
CREATE INDEX idx_transfers_buyer_id ON ownership_transfers(buyer_id);

-- Auto-update vehicle's current owner after transfer
CREATE OR REPLACE FUNCTION update_vehicle_owner_on_transfer()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vehicles
  SET customer_id = NEW.buyer_id, updated_at = NOW()
  WHERE vehicle_id = NEW.vehicle_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_ownership_transfer
  AFTER INSERT ON ownership_transfers
  FOR EACH ROW EXECUTE FUNCTION update_vehicle_owner_on_transfer();
```

- [ ] **Step 2: Run and verify B5 constraint works**

First insert a test customer and vehicle, then:
```sql
-- This should FAIL (B5 cert dated 31 days before transfer)
INSERT INTO ownership_transfers (vehicle_id, seller_id, buyer_id, transfer_date, b5_cert_no, b5_inspection_date)
VALUES (
  (SELECT vehicle_id FROM vehicles LIMIT 1),
  (SELECT customer_id FROM customers LIMIT 1),
  (SELECT customer_id FROM customers OFFSET 1 LIMIT 1),
  '2026-05-20',
  'B5TEST001',
  '2026-04-18'  -- 32 days before transfer
);
```

Expected: `ERROR: new row violates check constraint "b5_within_validity"`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/005_ownership_transfers.sql
git commit -m "feat: add ownership_transfers table with B5 compliance gate"
```

---

## Task 8: Migration 006 — import_staging table

**Files:**
- Create: `supabase/migrations/006_import_staging.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/006_import_staging.sql
-- Raw landing zone for all Excel/PDF imports. No constraints on raw_ fields.

CREATE TABLE import_staging (
  staging_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Raw strings — exactly as extracted from source file
  raw_customer_name   TEXT,
  raw_customer_code   TEXT,
  raw_ssm_or_ic       TEXT,
  raw_phone           TEXT,
  raw_address         TEXT,
  raw_email           TEXT,
  raw_plate           TEXT,
  raw_chassis         TEXT,
  raw_engine          TEXT,
  raw_maker           TEXT,
  raw_model           TEXT,
  raw_body_type       TEXT,
  raw_manufacture_yr  TEXT,
  raw_reg_date        TEXT,
  raw_gvw             TEXT,
  raw_kerb_weight     TEXT,
  raw_payload         TEXT,
  raw_doc_type        TEXT,
  raw_doc_number      TEXT,
  raw_issue_date      TEXT,
  raw_expiry_date     TEXT,

  -- Source tracking
  source_file         VARCHAR(255),       -- original filename
  source_type         VARCHAR(10)
                      CHECK (source_type IN ('excel','pdf','manual')),
  source_row          INT,                -- row number in source file

  -- Processing status
  valid_status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (valid_status IN ('pending','valid','error','imported')),
  error_log           TEXT,               -- human-readable validation errors

  -- Links to production tables after import
  mapped_customer_id  UUID REFERENCES customers(customer_id),
  mapped_vehicle_id   UUID REFERENCES vehicles(vehicle_id),

  imported_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staging_valid_status ON import_staging(valid_status);
CREATE INDEX idx_staging_source_file ON import_staging(source_file);
```

- [ ] **Step 2: Run and verify**

```sql
SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'import_staging';
```

Expected: `25`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_import_staging.sql
git commit -m "feat: add import_staging table for Excel/PDF ingestion"
```

---

## Task 9: Migration 007 — RLS policies

**Files:**
- Create: `supabase/migrations/007_rls_policies.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/007_rls_policies.sql
-- Roles: admin (Jason) | finance (TIUN) | sales | workshop

-- Helper: read role from JWT user_metadata or app_metadata
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt()->'user_metadata'->>'role',
    auth.jwt()->'app_metadata'->>'role'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_staging ENABLE ROW LEVEL SECURITY;

-- CUSTOMERS
-- admin, finance, sales: full access | workshop: read only
CREATE POLICY "customers_rw" ON customers FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','finance','sales'))
  WITH CHECK (get_user_role() IN ('admin','finance','sales'));

CREATE POLICY "customers_ro_workshop" ON customers FOR SELECT TO authenticated
  USING (get_user_role() = 'workshop');

-- VEHICLES
-- all roles: read | admin, sales: write
CREATE POLICY "vehicles_ro" ON vehicles FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin','finance','sales','workshop'));

CREATE POLICY "vehicles_rw" ON vehicles FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','sales'))
  WITH CHECK (get_user_role() IN ('admin','sales'));

-- VEHICLE_DOCUMENTS
-- all roles: read | admin, finance, sales: write
CREATE POLICY "docs_ro" ON vehicle_documents FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin','finance','sales','workshop'));

CREATE POLICY "docs_rw" ON vehicle_documents FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','finance','sales'))
  WITH CHECK (get_user_role() IN ('admin','finance','sales'));

-- OWNERSHIP_TRANSFERS
-- admin, finance, sales only
CREATE POLICY "transfers_rw" ON ownership_transfers FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','finance','sales'))
  WITH CHECK (get_user_role() IN ('admin','finance','sales'));

-- VEHICLE_MODELS
-- all roles: read | admin only: write
CREATE POLICY "models_ro" ON vehicle_models FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "models_rw" ON vehicle_models FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- IMPORT_STAGING
-- admin only
CREATE POLICY "staging_admin" ON import_staging FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');
```

- [ ] **Step 2: Run and verify RLS is enabled**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('customers','vehicles','vehicle_documents','ownership_transfers','vehicle_models','import_staging');
```

Expected: All 6 rows show `rowsecurity = true`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_rls_policies.sql
git commit -m "feat: add RLS policies for admin/finance/sales/workshop roles"
```

---

## Task 10: Migration 008 — views (fleet age + expiry alerts)

**Files:**
- Create: `supabase/migrations/008_views.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/008_views.sql

-- Fleet age view with Replacement Recommendation Index (RRI 0-100)
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

  -- Age in years (CKD = from reg_date, CBU = from manufacture_yr)
  CASE
    WHEN v.assembly_type = 'CBU'
      THEN (DATE_PART('year', NOW()) - v.manufacture_yr)::INT
    ELSE DATE_PART('year', AGE(NOW(), v.reg_date))::INT
  END AS age_years,

  -- Replacement Recommendation Index: 10 points per year, capped at 100
  LEAST(100, GREATEST(0,
    CASE
      WHEN v.assembly_type = 'CBU'
        THEN ((DATE_PART('year', NOW()) - v.manufacture_yr) * 10)::INT
      ELSE (DATE_PART('year', AGE(NOW(), v.reg_date)) * 10)::INT
    END
  )) AS rri,

  -- Flag trucks ≥ 7 years for replacement targeting
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

-- Expiry alert view — documents expiring within 60 days or already expired
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
```

- [ ] **Step 2: Run and verify views exist**

```sql
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public';
```

Expected: `fleet_age_view` and `expiry_alerts_view` both present.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/008_views.sql
git commit -m "feat: add fleet_age_view and expiry_alerts_view"
```

---

## Task 11: Seed test data

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create seed file**

```sql
-- supabase/seed.sql — Test data only. Do NOT run in production.

-- 3 test customers
INSERT INTO customers (customer_id, customer_code, company_name, entity_type, id_number, id_type, phone, address_line1, city, state, contact_person, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', '300-A0404', 'AIR KELANTAN SDN BHD', 'sdn_bhd', '200201020070', 'ssm', '09-7XXXXXX', 'JALAN SULTAN YAHYA PETRA', 'Kota Bharu', 'Kelantan', 'ENCIK AZIZ', 'active'),
  ('00000000-0000-0000-0000-000000000002', '300-B0125', 'BAE EXPRESS ENTERPRISE', 'enterprise', NULL, NULL, '012-XXXXXXX', 'LOT 5, JALAN ENTERPRISE', 'Kota Bharu', 'Kelantan', 'ENCIK BAHARUDDIN', 'active'),
  ('00000000-0000-0000-0000-000000000003', '300-A0165', 'AZMI & SITI NURBAYA RESOURCES', 'enterprise', 'KT0294420-W', 'ic', '019-XXXXXXX', 'KAMPUNG CHICHA', 'Kota Bharu', 'Kelantan', 'ENCIK AZMI', 'active');

-- 4 test vehicles (Air Kelantan fleet)
INSERT INTO vehicles (vehicle_id, customer_id, original_customer_id, plate_number, chassis_no, engine_no, maker, model_code, body_type, gvw_kg, kerb_weight_kg, payload_kg, engine_capacity, fuel_type, assembly_type, manufacture_yr, reg_date, sql_account_code, status)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DEA0001', 'PLHUCK1H408100001', 'N04CVA00001', 'HINO', 'XZU600R', 'WOODEN TIPPER', 7500, 3280, 4220, 4009, 'DISEL HIJAU', 'CKD', 2022, '2022-03-15', '300-A0404', 'active'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DEA0002', 'PLHUCK1H408100002', 'N04CVA00002', 'HINO', 'XZU600R', 'WOODEN TIPPER', 7500, 3280, 4220, 4009, 'DISEL HIJAU', 'CKD', 2022, '2022-03-15', '300-A0405', 'active'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'BPU2500', 'PLHZELOF900000001', 'N04CWH00001', 'HINO', 'XZU600R', 'LORI RIGID', 7500, 3280, 4220, 4009, 'DISEL HIJAU', 'CKD', 2018, '2018-06-01', '300-B0125', 'active'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'DBD3045', 'PLHUCK1H408100463', 'N04CVA25462', 'HINO', 'XZU710R', 'KARGO AM',   7500, 3280, 4220, 4009, 'DISEL HIJAU', 'CKD', 2017, '2018-01-29', '300-A0165', 'active');

-- Test documents
INSERT INTO vehicle_documents (vehicle_id, doc_type, doc_number, issue_date, expiry_date)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'insurance',  'POL-2026-0001', '2026-01-01', '2026-12-31'),
  ('10000000-0000-0000-0000-000000000001', 'puspakom',   'PSP-2026-0001', '2026-03-01', '2026-09-01'),
  ('10000000-0000-0000-0000-000000000003', 'insurance',  'POL-2025-0099', '2025-06-01', '2026-06-01'),
  ('10000000-0000-0000-0000-000000000004', 'puspakom',   'PSP-2026-0002', '2026-01-15', '2026-07-15');
```

- [ ] **Step 2: Run seed in Supabase SQL editor**

- [ ] **Step 3: Verify fleet age view**

```sql
SELECT company_name, plate_number, age_years, rri, replacement_due
FROM fleet_age_view
ORDER BY age_years DESC;
```

Expected: 4 rows. DBD3045 (2018) should show `age_years = 8`, `replacement_due = true`.

- [ ] **Step 4: Verify expiry alerts view**

```sql
SELECT company_name, plate_number, doc_type, expiry_date, days_until_expiry, alert_level
FROM expiry_alerts_view;
```

Expected: Documents expiring within 60 days shown with correct alert_level.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed.sql
git commit -m "chore: add seed data for schema testing"
```

---

## Task 12: JS client — customers.js

**Files:**
- Create: `src/lib/db/customers.js`

- [ ] **Step 1: Create file**

```javascript
// src/lib/db/customers.js
import { supabase } from '../supabase'

export async function getCustomers({ search = '', status = 'active' } = {}) {
  let query = supabase
    .from('customers')
    .select('*')
    .eq('status', status)
    .order('company_name')

  if (search) {
    query = query.ilike('company_name', `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getCustomerById(customerId) {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      vehicles (
        vehicle_id, plate_number, maker, model_code, body_type,
        manufacture_yr, reg_date, status, last_mileage_km
      )
    `)
    .eq('customer_id', customerId)
    .single()

  if (error) throw error
  return data
}

export async function createCustomer(customerData) {
  const { data, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCustomer(customerId, updates) {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('customer_id', customerId)
    .select()
    .single()

  if (error) throw error
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/customers.js
git commit -m "feat: add customers DB helper functions"
```

---

## Task 13: JS client — vehicles.js

**Files:**
- Create: `src/lib/db/vehicles.js`

- [ ] **Step 1: Create file**

```javascript
// src/lib/db/vehicles.js
import { supabase } from '../supabase'

export async function getVehiclesByCustomer(customerId) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('customer_id', customerId)
    .order('reg_date', { ascending: false })

  if (error) throw error
  return data
}

export async function getVehicleByPlate(plateNumber) {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      customers ( customer_id, company_name, phone, email ),
      vehicle_documents ( document_id, doc_type, doc_number, expiry_date, file_url )
    `)
    .eq('plate_number', plateNumber.toUpperCase())
    .single()

  if (error) throw error
  return data
}

export async function createVehicle(vehicleData) {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      ...vehicleData,
      plate_number: vehicleData.plate_number?.toUpperCase(),
      chassis_no: vehicleData.chassis_no?.toUpperCase(),
      engine_no: vehicleData.engine_no?.toUpperCase(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateVehicleMileage(vehicleId, mileageKm) {
  const { data, error } = await supabase
    .from('vehicles')
    .update({
      last_mileage_km: mileageKm,
      last_mileage_date: new Date().toISOString().split('T')[0],
    })
    .eq('vehicle_id', vehicleId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getReplacementTargets() {
  const { data, error } = await supabase
    .from('fleet_age_view')
    .select('*')
    .eq('replacement_due', true)
    .order('rri', { ascending: false })

  if (error) throw error
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/vehicles.js
git commit -m "feat: add vehicles DB helper functions"
```

---

## Task 14: JS client — documents.js

**Files:**
- Create: `src/lib/db/documents.js`

- [ ] **Step 1: Create file**

```javascript
// src/lib/db/documents.js
import { supabase } from '../supabase'

export async function getExpiryAlerts() {
  const { data, error } = await supabase
    .from('expiry_alerts_view')
    .select('*')
    .order('expiry_date', { ascending: true })

  if (error) throw error
  return data
}

export async function getDocumentsByVehicle(vehicleId) {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function uploadDocument(vehicleId, file, docMeta) {
  // 1. Upload file to Supabase Storage
  const fileExt = file.name.split('.').pop()
  const filePath = `vehicles/${vehicleId}/${docMeta.doc_type}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('vehicle-documents')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  // 2. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('vehicle-documents')
    .getPublicUrl(filePath)

  // 3. Save document record
  const { data, error } = await supabase
    .from('vehicle_documents')
    .insert({
      vehicle_id: vehicleId,
      file_url: publicUrl,
      file_name: file.name,
      file_size_bytes: file.size,
      ...docMeta,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createDocument(vehicleId, docData) {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .insert({ vehicle_id: vehicleId, ...docData })
    .select()
    .single()

  if (error) throw error
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/documents.js
git commit -m "feat: add documents DB helper functions with Storage upload"
```

---

## Task 15: Create Supabase Storage bucket

**Files:** None (Supabase dashboard)

- [ ] **Step 1: Create storage bucket**

Open: https://supabase.com/dashboard/project/gruvcmbsvoauhftfcoio/storage/buckets

Click **New bucket**, name it: `vehicle-documents`

Set to **Private** (access controlled by RLS)

- [ ] **Step 2: Add storage RLS policy in SQL editor**

```sql
-- Allow authenticated users to upload to their vehicle folder
CREATE POLICY "authenticated_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vehicle-documents');

-- Allow authenticated users to read vehicle documents
CREATE POLICY "authenticated_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vehicle-documents');
```

- [ ] **Step 3: Commit storage policy**

```bash
git add supabase/migrations/009_storage_policies.sql
git commit -m "feat: add Supabase Storage bucket policies for vehicle documents"
```

---

## Final Verification

- [ ] All 6 tables exist in Supabase dashboard
- [ ] All 2 views exist (`fleet_age_view`, `expiry_alerts_view`)
- [ ] RLS enabled on all tables (6 tables show `rowsecurity = true`)
- [ ] Seed data returns correct fleet age and expiry alerts
- [ ] Storage bucket `vehicle-documents` created
- [ ] All JS helper files exist in `src/lib/db/`

```sql
-- Run this final check in Supabase SQL editor
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') AS views,
  (SELECT COUNT(*) FROM customers) AS customers,
  (SELECT COUNT(*) FROM vehicles) AS vehicles,
  (SELECT COUNT(*) FROM vehicle_models) AS models;
```

Expected: `tables=6, views=2, customers=3, vehicles=4, models=8`
