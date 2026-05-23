-- Migration 012: promote_import_batch function
-- Promotes valid import_staging rows into actual customers and vehicles.
-- Called via supabase.rpc('promote_import_batch', { p_batch_id }) from the
-- import UI after the user has reviewed and confirmed the staged data.
--
-- SECURITY INVOKER so RLS policies (admin-only for import_staging,
-- admin/finance/sales for customers, admin/sales for vehicles) are enforced
-- at the per-statement level inside the function body.
--
-- Safe to re-run: uses CREATE OR REPLACE FUNCTION.

BEGIN;

CREATE OR REPLACE FUNCTION promote_import_batch(p_batch_id VARCHAR(255))
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  r                   RECORD;
  v_customer_id       UUID;
  v_vehicle_id        UUID;
  v_customers_created INT := 0;
  v_customers_matched INT := 0;
  v_vehicles_created  INT := 0;
  v_errors            INT := 0;
  v_error_detail      TEXT;
  v_user_id           UUID;
BEGIN
  -- Current user for audit trail on imported_by
  v_user_id := auth.uid();

  FOR r IN
    SELECT *
    FROM import_staging
    WHERE import_batch = p_batch_id
      AND valid_status = 'valid'
    ORDER BY source_row NULLS LAST
  LOOP
    BEGIN
      -- ───────────────────────────────────────────────────────────────────────
      -- Step 2a: Customer dedup — match on company_name (case-insensitive)
      -- ───────────────────────────────────────────────────────────────────────
      SELECT customer_id INTO v_customer_id
      FROM customers
      WHERE LOWER(TRIM(company_name)) = LOWER(TRIM(r.raw_customer_name))
      LIMIT 1;

      IF v_customer_id IS NULL THEN
        INSERT INTO customers (
          company_name,
          customer_code,
          entity_type,
          id_number,
          id_type,
          phone,
          email,
          address_line1,
          notes,
          status
        ) VALUES (
          COALESCE(NULLIF(TRIM(r.raw_customer_name), ''), 'Unknown Customer'),
          NULLIF(TRIM(r.raw_customer_code), ''),
          'other',
          NULLIF(TRIM(r.raw_ssm_or_ic), ''),
          CASE
            WHEN r.normalized_ssm IS NOT NULL THEN 'ssm'
            ELSE 'other'
          END,
          r.normalized_phone,
          NULLIF(TRIM(r.raw_email), ''),
          NULLIF(TRIM(r.raw_address), ''),
          'Imported from batch: ' || p_batch_id,
          'active'
        )
        RETURNING customer_id INTO v_customer_id;

        v_customers_created := v_customers_created + 1;
      ELSE
        v_customers_matched := v_customers_matched + 1;
      END IF;

      -- ───────────────────────────────────────────────────────────────────────
      -- Step 2b: Vehicle creation
      -- Skip vehicle creation when no plate number is available (common for
      -- prospective customers or parts-only contacts).
      -- ───────────────────────────────────────────────────────────────────────
      IF r.normalized_plate IS NOT NULL AND TRIM(r.normalized_plate) <> '' THEN
        INSERT INTO vehicles (
          customer_id,
          plate_number,
          chassis_no,
          engine_no,
          maker,
          model_code,
          body_type,
          gvw_kg,
          reg_date,
          manufacture_yr,
          status
        ) VALUES (
          v_customer_id,
          UPPER(TRIM(r.normalized_plate)),
          COALESCE(NULLIF(TRIM(r.raw_chassis), ''), 'PENDING-' || r.staging_id::TEXT),
          COALESCE(NULLIF(TRIM(r.raw_engine), ''),  'PENDING-' || r.staging_id::TEXT),
          COALESCE(NULLIF(TRIM(r.raw_maker), ''),   'HINO'),
          COALESCE(NULLIF(TRIM(r.raw_model), ''),   '300 Series'),
          NULLIF(TRIM(r.raw_body_type), ''),
          r.parsed_gvw_kg,
          r.parsed_reg_date,
          r.parsed_manufacture_yr,
          'active'
        )
        RETURNING vehicle_id INTO v_vehicle_id;

        v_vehicles_created := v_vehicles_created + 1;
      ELSE
        v_vehicle_id := NULL;
      END IF;

      -- ───────────────────────────────────────────────────────────────────────
      -- Step 2c: Mark staging row as promoted
      -- ───────────────────────────────────────────────────────────────────────
      UPDATE import_staging
      SET
        mapped_customer_id = v_customer_id,
        mapped_vehicle_id  = v_vehicle_id,
        valid_status       = 'imported',
        imported_at        = NOW(),
        imported_by        = v_user_id
      WHERE staging_id = r.staging_id;

    EXCEPTION WHEN OTHERS THEN
      -- ─────────────────────────────────────────────────────────────────────
      -- Per-row error handling: log and continue with remaining rows.
      -- The staging row is marked as 'error' so the user can inspect and
      -- retry after fixing the data.
      -- ─────────────────────────────────────────────────────────────────────
      v_errors := v_errors + 1;
      GET STACKED DIAGNOSTICS v_error_detail = MESSAGE_TEXT;

      UPDATE import_staging
      SET
        valid_status = 'error',
        error_log = COALESCE(error_log, '[]'::JSONB) || jsonb_build_array(
          jsonb_build_object(
            'step',  'promotion',
            'error', v_error_detail,
            'row',   r.source_row,
            'batch', p_batch_id
          )
        )
      WHERE staging_id = r.staging_id;
    END;
  END LOOP;

  -- Return summary JSON for the import UI
  RETURN jsonb_build_object(
    'customers_created', v_customers_created,
    'customers_matched', v_customers_matched,
    'vehicles_created',  v_vehicles_created,
    'errors',            v_errors
  );
END;
$$;

COMMIT;
