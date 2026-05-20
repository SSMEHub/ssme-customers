-- Shared updated_at trigger (reused by all tables)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE customers (
  customer_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code     VARCHAR(20) UNIQUE,
  company_name      VARCHAR(255) NOT NULL,
  entity_type       VARCHAR(50) NOT NULL
                    CHECK (entity_type IN ('sdn_bhd','enterprise','individual','cooperative','gov_agency','other')),
  id_number         VARCHAR(100),
  id_type           VARCHAR(10)
                    CHECK (id_type IN ('ssm','ic','other')),
  phone             VARCHAR(50),
  email             VARCHAR(100),
  address_line1     VARCHAR(255),
  address_line2     VARCHAR(255),
  postcode          VARCHAR(10),
  city              VARCHAR(100),
  state             VARCHAR(100) DEFAULT 'Kelantan',
  contact_person    VARCHAR(255),
  notes             TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','rejected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_company_name ON customers USING gin(to_tsvector('simple', company_name));
CREATE INDEX idx_customers_id_number ON customers (id_number);
CREATE INDEX idx_customers_customer_code ON customers (customer_code);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
