CREATE TABLE vehicles (
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

CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX idx_vehicles_chassis_no ON vehicles(chassis_no);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_reg_date ON vehicles(reg_date);

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
