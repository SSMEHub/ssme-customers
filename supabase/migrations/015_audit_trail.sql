-- ─────────────────────────────────────────────────────────────────────────────
-- 015_audit_trail.sql
-- Append-only audit log for Module 1 source-of-truth tables.
--
-- Tables covered: customers, vehicles, vehicle_documents, ownership_transfers
-- Access: SELECT for admin + finance only (via RLS).
--         INSERT/UPDATE/DELETE locked out for all authenticated users —
--         only the SECURITY DEFINER trigger function can write rows.
--
-- Idempotent: safe to re-run against a live DB.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AUDIT LOG TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT        NOT NULL,
  row_pk      UUID,
  action      TEXT        NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by  UUID        DEFAULT auth.uid(),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_data    JSONB,
  new_data    JSONB
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_log_table_row
  ON audit_log (table_name, row_pk);

CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at
  ON audit_log (changed_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TRIGGER FUNCTION
-- Derives row_pk from the known PK column name per table:
--   customers            → customer_id
--   vehicles             → vehicle_id
--   vehicle_documents    → document_id
--   ownership_transfers  → transfer_id
-- SECURITY DEFINER runs as the function owner, bypassing RLS on audit_log,
-- so the trigger can always insert — even though authenticated users cannot.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_row_pk   UUID;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  -- Resolve the row's UUID primary key from the well-known column name per table.
  IF TG_TABLE_NAME = 'customers' THEN
    v_row_pk := CASE TG_OP WHEN 'DELETE' THEN OLD.customer_id ELSE NEW.customer_id END;
  ELSIF TG_TABLE_NAME = 'vehicles' THEN
    v_row_pk := CASE TG_OP WHEN 'DELETE' THEN OLD.vehicle_id ELSE NEW.vehicle_id END;
  ELSIF TG_TABLE_NAME = 'vehicle_documents' THEN
    v_row_pk := CASE TG_OP WHEN 'DELETE' THEN OLD.document_id ELSE NEW.document_id END;
  ELSIF TG_TABLE_NAME = 'ownership_transfers' THEN
    v_row_pk := CASE TG_OP WHEN 'DELETE' THEN OLD.transfer_id ELSE NEW.transfer_id END;
  ELSE
    -- Fallback for any future table attached to this trigger.
    v_row_pk := NULL;
  END IF;

  -- Capture row snapshots according to operation type.
  IF TG_OP = 'INSERT' THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  END IF;

  INSERT INTO audit_log (table_name, row_pk, action, changed_by, changed_at, old_data, new_data)
  VALUES (TG_TABLE_NAME, v_row_pk, TG_OP, auth.uid(), NOW(), v_old_data, v_new_data);

  -- AFTER triggers must return NULL (row already committed).
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ATTACH TRIGGERS (drop-if-exists first for idempotency)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS audit_customers           ON customers;
DROP TRIGGER IF EXISTS audit_vehicles            ON vehicles;
DROP TRIGGER IF EXISTS audit_vehicle_documents   ON vehicle_documents;
DROP TRIGGER IF EXISTS audit_ownership_transfers ON ownership_transfers;

CREATE TRIGGER audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_vehicles
  AFTER INSERT OR UPDATE OR DELETE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_vehicle_documents
  AFTER INSERT OR UPDATE OR DELETE ON vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_ownership_transfers
  AFTER INSERT OR UPDATE OR DELETE ON ownership_transfers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- Pattern matches 010_module1_full_schema.sql: ENABLE RLS, DROP IF EXISTS,
-- then CREATE POLICY ... TO authenticated USING (get_user_role() IN (...)).
-- No INSERT/UPDATE/DELETE policy is created — authenticated users have no
-- write path; only the SECURITY DEFINER trigger function can insert rows.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_ro_admin_finance" ON audit_log;

CREATE POLICY "audit_log_ro_admin_finance" ON audit_log
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'finance'));
