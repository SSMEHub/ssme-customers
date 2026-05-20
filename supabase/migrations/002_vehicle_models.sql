CREATE TABLE vehicle_models (
  model_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maker             VARCHAR(100) NOT NULL,
  model_code        VARCHAR(100) NOT NULL,
  description       VARCHAR(255),
  engine_capacity   INT,
  fuel_type         VARCHAR(50),
  gvw_kg            INT,
  usage_class       VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(maker, model_code)
);

INSERT INTO vehicle_models (maker, model_code, description, engine_capacity, fuel_type, gvw_kg) VALUES
  ('HINO', 'WU302R',  '300 Series Light Duty',   4009, 'DISEL HIJAU', 3500),
  ('HINO', 'WU710R',  '300 Series Medium Duty',  4009, 'DISEL HIJAU', 7500),
  ('HINO', 'WU720R',  '300 Series Medium Duty',  4009, 'DISEL HIJAU', 7500),
  ('HINO', 'XZC710R', '500 Series Medium Duty',  7684, 'DISEL HIJAU', 12500),
  ('HINO', 'XZC730R', '500 Series Medium Duty',  7684, 'DISEL HIJAU', 14000),
  ('HINO', 'XZU600K', '300 Series Light Duty',   4009, 'DISEL HIJAU', 6000),
  ('HINO', 'XZU600R', '300 Series Light Duty',   4009, 'DISEL HIJAU', 6000),
  ('HINO', 'XZU710R', '300 Series Medium Duty',  4009, 'DISEL HIJAU', 7500);
