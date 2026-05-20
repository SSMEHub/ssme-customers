CREATE TABLE ownership_transfers (
  transfer_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id            UUID NOT NULL REFERENCES vehicles(vehicle_id),
  seller_id             UUID NOT NULL REFERENCES customers(customer_id),
  buyer_id              UUID NOT NULL REFERENCES customers(customer_id),
  transfer_date         DATE NOT NULL,
  b5_cert_no            VARCHAR(100) NOT NULL,
  b5_inspection_date    DATE NOT NULL,
  bank_release_ref      VARCHAR(100),
  special_case          VARCHAR(30)
                        CHECK (special_case IN ('deceased','abroad','dissolved_corp','missing_owner')),
  probate_ref           VARCHAR(100),
  transfer_price        DECIMAL(12,2),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT b5_within_validity CHECK (
    transfer_date <= b5_inspection_date + INTERVAL '30 days'
  )
);

CREATE INDEX idx_transfers_vehicle_id ON ownership_transfers(vehicle_id);
CREATE INDEX idx_transfers_buyer_id ON ownership_transfers(buyer_id);

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
