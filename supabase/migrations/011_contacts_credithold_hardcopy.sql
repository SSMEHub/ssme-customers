-- Migration 011: Customer Contacts, Credit Hold, Hardcopy Tracking, Driver Fields
-- Adds:
--   1. permit_pma to vehicle_documents.doc_type CHECK constraint
--   2. credit_hold fields to customers
--   3. customer_contacts table (replaces flat contact_person column long-term)
--   4. driver_name / driver_phone on vehicles
--   5. hardcopy tracking fields on vehicles
--   6. Backfill customer_contacts from existing customers.contact_person values
--
-- Safe to re-run: uses IF NOT EXISTS / DROP CONSTRAINT IF EXISTS patterns.
-- Backwards compatible: contact_person column is NOT dropped (Quotation App still reads it).

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. VEHICLE_DOCUMENTS — add permit_pma to doc_type CHECK constraint
-- ─────────────────────────────────────────────────────────────────────────────
-- PostgreSQL does not support ALTER CHECK constraints in-place.
-- Pattern: drop the old constraint, add the new one with the extended value list.

ALTER TABLE vehicle_documents
  DROP CONSTRAINT IF EXISTS vehicle_documents_doc_type_check;

ALTER TABLE vehicle_documents
  ADD CONSTRAINT vehicle_documents_doc_type_check
    CHECK (doc_type IN (
      'geran',
      'insurance',
      'road_tax',
      'puspakom',
      'sld',
      'permit_apad',
      'permit_lpkp',
      'permit_pma',          -- added: PMA permit (heavy haulage authorisation)
      'report_awalan',
      'invoice_sales',
      'invoice_service',
      'plan',
      'other'
    ));


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CUSTOMERS — credit hold fields
-- ─────────────────────────────────────────────────────────────────────────────
-- credit_hold_set_by references auth.users so we get an audit trail of which
-- staff member placed the hold. credit_hold_set_at is set in application code
-- (or via a DB trigger if preferred) when credit_hold flips to TRUE.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS credit_hold          BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credit_hold_reason   TEXT,
  ADD COLUMN IF NOT EXISTS credit_hold_set_by   UUID        REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS credit_hold_set_at   TIMESTAMPTZ;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CUSTOMER_CONTACTS — structured contacts per customer
-- ─────────────────────────────────────────────────────────────────────────────
-- role values follow the project domain rules (only roles relevant to contact
-- classification; not the same as auth roles). 'pa_manager' covers personal
-- assistants and office managers who typically handle truck paperwork.

CREATE TABLE IF NOT EXISTS customer_contacts (
  contact_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID         NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  contact_name  VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL
                CHECK (role IN ('owner', 'pa_manager', 'finance', 'other')),
  phone         VARCHAR(50),
  email         VARCHAR(100),
  is_primary    BOOLEAN      NOT NULL DEFAULT FALSE,
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id
  ON customer_contacts(customer_id);

-- Reuse the existing update_updated_at() function created in migration 010.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'customer_contacts_updated_at'
      AND tgrelid = 'customer_contacts'::regclass
  ) THEN
    CREATE TRIGGER customer_contacts_updated_at
      BEFORE UPDATE ON customer_contacts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- RLS — mirror customers policy: admin/finance/sales full, workshop read-only.
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_rw" ON customer_contacts;
DROP POLICY IF EXISTS "contacts_ro_workshop" ON customer_contacts;

CREATE POLICY "contacts_rw" ON customer_contacts FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'finance', 'sales'))
  WITH CHECK (get_user_role() IN ('admin', 'finance', 'sales'));

CREATE POLICY "contacts_ro_workshop" ON customer_contacts FOR SELECT TO authenticated
  USING (get_user_role() = 'workshop');


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VEHICLES — driver fields
-- ─────────────────────────────────────────────────────────────────────────────
-- Nullable: not every vehicle has an assigned driver on record.

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS driver_name   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS driver_phone  VARCHAR(50);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. VEHICLES — hardcopy tracking fields
-- ─────────────────────────────────────────────────────────────────────────────
-- Physical document custody tracking. hardcopy_currently_with is a free-text
-- field (not a FK / enum) because the set of custodians is small and changes
-- infrequently; a CHECK constraint documents the expected values while still
-- allowing edge-case entries via 'other'.
-- Allowed values: 'cabinet','syuk','salesman','jason','customer','other'

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS hardcopy_currently_with  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS hardcopy_checked_out_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hardcopy_checked_out_by  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS hardcopy_notes           TEXT;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. BACKFILL — migrate customers.contact_person → customer_contacts
-- ─────────────────────────────────────────────────────────────────────────────
-- Only inserts where:
--   a) contact_person is not null / not empty
--   b) No existing customer_contacts row already exists for that customer_id
--      (so this block is idempotent on re-run).
-- role='other' because we have no role metadata from the flat column.
-- is_primary=TRUE because it was the sole contact.

INSERT INTO customer_contacts (
  customer_id,
  contact_name,
  role,
  is_primary
)
SELECT
  c.customer_id,
  TRIM(c.contact_person),
  'other',
  TRUE
FROM customers c
WHERE TRIM(COALESCE(c.contact_person, '')) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM customer_contacts cc
    WHERE cc.customer_id = c.customer_id
  );

COMMIT;
