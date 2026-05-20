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
  emission_val      DECIMAL(5,2),
  brake_eff_pct     DECIMAL(5,2),
  pass_fail         VARCHAR(15) CHECK (pass_fail IN ('pass','fail','conditional')),
  gps_sirim_no      VARCHAR(100),
  sld_calib_date    DATE,
  file_url          TEXT,
  file_name         VARCHAR(255),
  file_size_bytes   INT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docs_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX idx_docs_doc_type ON vehicle_documents(doc_type);
CREATE INDEX idx_docs_expiry_date ON vehicle_documents(expiry_date)
  WHERE expiry_date IS NOT NULL;
