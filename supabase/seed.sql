-- supabase/seed.sql — Test data only. Do NOT run in production.

-- 3 test customers
INSERT INTO customers (customer_id, customer_code, company_name, entity_type, id_number, id_type, phone, address_line1, city, state, contact_person, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', '300-A0404', 'AIR KELANTAN SDN BHD', 'sdn_bhd', '200201020070', 'ssm', '09-7XXXXXX', 'JALAN SULTAN YAHYA PETRA', 'Kota Bharu', 'Kelantan', 'ENCIK AZIZ', 'active'),
  ('00000000-0000-0000-0000-000000000002', '300-B0125', 'BAE EXPRESS ENTERPRISE', 'enterprise', NULL, NULL, '012-XXXXXXX', 'LOT 5, JALAN ENTERPRISE', 'Kota Bharu', 'Kelantan', 'ENCIK BAHARUDDIN', 'active'),
  ('00000000-0000-0000-0000-000000000003', '300-A0165', 'AZMI & SITI NURBAYA RESOURCES', 'enterprise', 'KT0294420-W', 'ic', '019-XXXXXXX', 'KAMPUNG CHICHA', 'Kota Bharu', 'Kelantan', 'ENCIK AZMI', 'active');

-- 4 test vehicles
INSERT INTO vehicles (vehicle_id, customer_id, original_customer_id, plate_number, chassis_no, engine_no, maker, model_code, body_type, gvw_kg, kerb_weight_kg, payload_kg, engine_capacity, fuel_type, assembly_type, manufacture_yr, reg_date, sql_account_code, status)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DEA0001', 'PLHUCK1H408100001', 'N04CVA00001', 'HINO', 'XZU600R', 'WOODEN TIPPER', 7500, 3280, 4220, 4009, 'DISEL HIJAU', 'CKD', 2022, '2022-03-15', '300-A0404', 'active'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DEA0002', 'PLHUCK1H408100002', 'N04CVA00002', 'HINO', 'XZU600R', 'WOODEN TIPPER', 7500, 3280, 4220, 4009, 'DISEL HIJAU', 'CKD', 2022, '2022-03-15', '300-A0405', 'active'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'BPU2500', 'PLHZELOF900000001', 'N04CWH00001', 'HINO', 'XZU600R', 'LORI RIGID', 7500, 3280, 4220, 4009, 'DISEL HIJAU', 'CKD', 2018, '2018-06-01', '300-B0125', 'active'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'DBD3045', 'PLHUCK1H408100463', 'N04CVA25462', 'HINO', 'XZU710R', 'KARGO AM', 7500, 3280, 4220, 4009, 'DISEL HIJAU', 'CKD', 2017, '2018-01-29', '300-A0165', 'active');

-- 4 test documents
INSERT INTO vehicle_documents (vehicle_id, doc_type, doc_number, issue_date, expiry_date)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'insurance',  'POL-2026-0001', '2026-01-01', '2026-12-31'),
  ('10000000-0000-0000-0000-000000000001', 'puspakom',   'PSP-2026-0001', '2026-03-01', '2026-09-01'),
  ('10000000-0000-0000-0000-000000000003', 'insurance',  'POL-2025-0099', '2025-06-01', '2026-06-01'),
  ('10000000-0000-0000-0000-000000000004', 'puspakom',   'PSP-2026-0002', '2026-01-15', '2026-07-15');
