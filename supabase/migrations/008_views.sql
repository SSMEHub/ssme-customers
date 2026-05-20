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
  CASE
    WHEN v.assembly_type = 'CBU'
      THEN (DATE_PART('year', NOW()) - v.manufacture_yr)::INT
    ELSE DATE_PART('year', AGE(NOW(), v.reg_date))::INT
  END AS age_years,
  LEAST(100, GREATEST(0,
    CASE
      WHEN v.assembly_type = 'CBU'
        THEN ((DATE_PART('year', NOW()) - v.manufacture_yr) * 10)::INT
      ELSE (DATE_PART('year', AGE(NOW(), v.reg_date)) * 10)::INT
    END
  )) AS rri,
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
