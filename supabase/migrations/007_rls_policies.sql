CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt()->'user_metadata'->>'role',
    auth.jwt()->'app_metadata'->>'role'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_staging ENABLE ROW LEVEL SECURITY;

-- CUSTOMERS: admin, finance, sales = full | workshop = read only
CREATE POLICY "customers_rw" ON customers FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','finance','sales'))
  WITH CHECK (get_user_role() IN ('admin','finance','sales'));

CREATE POLICY "customers_ro_workshop" ON customers FOR SELECT TO authenticated
  USING (get_user_role() = 'workshop');

-- VEHICLES: all read | admin, sales write
CREATE POLICY "vehicles_ro" ON vehicles FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin','finance','sales','workshop'));

CREATE POLICY "vehicles_rw" ON vehicles FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','sales'))
  WITH CHECK (get_user_role() IN ('admin','sales'));

-- VEHICLE_DOCUMENTS: all read | admin, finance, sales write
CREATE POLICY "docs_ro" ON vehicle_documents FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin','finance','sales','workshop'));

CREATE POLICY "docs_rw" ON vehicle_documents FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','finance','sales'))
  WITH CHECK (get_user_role() IN ('admin','finance','sales'));

-- OWNERSHIP_TRANSFERS: admin, finance, sales only
CREATE POLICY "transfers_rw" ON ownership_transfers FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','finance','sales'))
  WITH CHECK (get_user_role() IN ('admin','finance','sales'));

-- VEHICLE_MODELS: all read | admin write
CREATE POLICY "models_ro" ON vehicle_models FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "models_rw" ON vehicle_models FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- IMPORT_STAGING: admin only
CREATE POLICY "staging_admin" ON import_staging FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');
