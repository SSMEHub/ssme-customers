#!/usr/bin/env node

/**
 * backfill-vehicles.mjs
 *
 * Reads the SQL Accounting Customer Listing Excel and backfills vehicles for
 * existing customers in the SSME Hub customers table.
 *
 * Usage:
 *   node scripts/backfill-vehicles.mjs              # dry run (default)
 *   node scripts/backfill-vehicles.mjs --execute     # actually insert
 *
 * The Excel file is a SQL Accounting export with format:
 *   - Each "customer" spans 2-3 rows (data + status)
 *   - Company name is first line of the billing address (__EMPTY_2 / column C)
 *   - Some account names contain: COMPANY_NAME - PLATE_NUMBER - BODY_TYPE
 *   - Uses same parseAccountName logic from ImportPage.jsx
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://gruvcmbsvoauhftfcoio.supabase.co';
const EXCEL_PATH = '/Users/teckchuan/Downloads/Cust Customer Listing 1.xlsx';

// ── Read anon key from .env.local ─────────────────────────────────────────────

const envPath = resolve(__dirname, '..', '.env.local');

function loadAnonKey() {
  if (!existsSync(envPath)) {
    console.error('ERROR: .env.local not found at', envPath);
    console.error('Cannot read VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  const contents = readFileSync(envPath, 'utf-8');
  const match = contents.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m);
  if (!match) {
    console.error('ERROR: VITE_SUPABASE_ANON_KEY not found in .env.local');
    process.exit(1);
  }
  return match[1].trim();
}

// ── Parser helpers (from ImportPage.jsx) ─────────────────────────────────────

const MY_PLATE_RE = /^[A-Z]{1,3}[0-9]{1,4}[A-Z]{0,2}$/;

function normalisePlate(raw) {
  if (!raw) return { plate: null, error: null };
  const cleaned = String(raw).toUpperCase().replace(/\s/g, '');
  if (MY_PLATE_RE.test(cleaned)) return { plate: cleaned, error: null };
  return { plate: null, error: 'invalid_plate_format' };
}

const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30));

function parseDate(raw) {
  if (raw === null || raw === undefined || raw === '') {
    return { date: null, error: null };
  }

  const s = String(raw).trim();

  // ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { date: s, error: null };

  // Malaysian DD/MM/YYYY variants
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!isNaN(Date.parse(iso))) return { date: iso, error: null };
  }

  // Excel serial
  const n = Number(raw);
  if (!isNaN(n) && Number.isInteger(n) && n >= 20000 && n <= 60000) {
    const d = new Date(EXCEL_EPOCH.getTime() + n * 86400000);
    return { date: d.toISOString().split('T')[0], error: null };
  }

  return { date: null, error: 'unparseable_date' };
}

/**
 * parseAccountName — extracts company_name, plate_number, model_code, body_type
 * from a SQL Accounting "Account Name" string.
 *
 * Expected format:  "COMPANY_NAME - PLATE_NUMBER - BODY_TYPE"
 * Or:              "USED COMPANY_NAME - PLATE_NUMBER - BODY_TYPE"
 */
function parseAccountName(raw) {
  if (!raw) return {};
  const str = String(raw).trim();

  if (str.includes('***REJECTED CUSTOMER***')) {
    return { valid_status: 'skipped', raw_account_name: str };
  }

  const isUsed = /^USED\s+/i.test(str);
  const cleanStr = isUsed ? str.replace(/^USED\s+/i, '') : str;

  const parts = cleanStr.split(' - ').map((p) => p.trim());
  const companyName = parts[0] || '';

  let plate = null;
  let modelCode = null;
  let bodyType = null;

  if (parts[1]) {
    const { plate: p, error } = normalisePlate(parts[1]);
    if (!error && p) {
      plate = p;
    } else {
      modelCode = parts[1];
    }
  }

  if (parts[2]) bodyType = parts[2];

  return {
    company_name: companyName,
    plate_number: plate,
    model_code: modelCode,
    body_type: bodyType,
    is_second_hand: isUsed,
    valid_status: 'pending',
    raw_account_name: str,
  };
}

// ── Excel parsing ─────────────────────────────────────────────────────────────

/**
 * Parse the customer listing Excel using named columns (same approach as ImportPage.jsx).
 *
 * The SQL Accounting export has these columns:
 *   Account Name, Customer Code, Phone, SSM, Plate, Maker, Model,
 *   Body Type, Chassis, Engine, Reg Date, Delivery Date, GVW, Year, etc.
 *
 * Each row = one SQL Accounting account.
 * Account Name format: "COMPANY_NAME - PLATE_NUMBER - BODY_TYPE"
 * Same company appearing multiple times = one customer with multiple vehicles.
 */
function parseExcelRows(rows) {
  const records = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Parse Account Name (same logic as ImportPage.jsx)
    const accountName = row['Account Name'] ?? row['account_name'] ?? '';
    const parsed = parseAccountName(accountName);

    if (parsed.valid_status === 'skipped') {
      records.push({
        customer_code: row['Customer Code'] ?? row['customer_code'] ?? null,
        company_name: parsed.company_name || accountName,
        plate_number: null,
        valid_status: 'skipped',
      });
      continue;
    }

    if (!parsed.company_name) continue;

    // Plate: from Account Name parse OR dedicated Plate column
    let plate = parsed.plate_number;
    if (!plate) {
      const plateCol = row['Plate'] ?? row['plate_number'];
      if (plateCol) {
        const result = normalisePlate(plateCol);
        if (!result.error) plate = result.plate;
      }
    }

    // Dates
    const regDateRaw = row['Reg Date'] ?? row['reg_date'];
    const deliveryDateRaw = row['Delivery Date'] ?? row['delivery_date'];
    const { date: regDate } = parseDate(regDateRaw);
    const { date: deliveryDate } = parseDate(deliveryDateRaw);

    // Numeric
    const gvwRaw = row['GVW'] ?? row['gvw_kg'];
    const yearRaw = row['Year'] ?? row['manufacture_yr'];
    const gvw = (gvwRaw !== undefined && gvwRaw !== '') ? Number(gvwRaw) : null;
    const manufactureYr = (yearRaw !== undefined && yearRaw !== '') ? Number(yearRaw) : null;

    records.push({
      customer_code: row['Customer Code'] ?? row['customer_code'] ?? null,
      company_name: parsed.company_name,
      plate_number: plate,
      chassis_no: row['Chassis'] ?? row['chassis_no'] ?? null,
      engine_no: row['Engine'] ?? row['engine_no'] ?? null,
      maker: row['Maker'] ?? row['maker'] ?? null,
      model_code: parsed.model_code || (row['Model'] ?? row['model_code']) || null,
      body_type: parsed.body_type || (row['Body Type'] ?? row['body_type']) || null,
      reg_date: regDate,
      delivery_date: deliveryDate,
      gvw_kg: gvw && !isNaN(gvw) ? gvw : null,
      manufacture_yr: manufactureYr && !isNaN(manufactureYr) ? manufactureYr : null,
      phone: row['Phone'] ?? row['phone'] ?? null,
      ssm_or_ic: row['SSM'] ?? row['id_number'] ?? null,
      valid_status: 'pending',
    });
  }

  return records;
}

// ── Company name cleaning ─────────────────────────────────────────────────────

/**
 * Normalise a company name for matching — strips registration numbers,
 * IC numbers, extra whitespace, and common suffixes that appear in
 * SQL Accounting but might not be in the customers table.
 */
function normaliseCompanyName(name) {
  if (!name) return '';
  return name
    // Remove trailing parenthetical registration/IC numbers: (123456-D), (I/C 123...)
    .replace(/\s*\([^)]*(?:registration|ic|roc|no\.?)[^)]*\)\s*$/i, '')
    // Remove trailing parenthetical with just numbers+letters: (587733-D)
    .replace(/\s*\([A-Z0-9-]+\)\s*$/, '')
    // Remove registration/IC inline
    .replace(/\s*\(I\/C\s+\d+[-\d]*\)\s*/gi, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const isExecute = process.argv.includes('--execute');

  console.log('═══ SSME Hub — Vehicle Backfill Script ═══');
  console.log('');
  console.log(`Mode: ${isExecute ? 'EXECUTE (will insert vehicles)' : 'DRY RUN (no changes)'}`);
  console.log(`Excel: ${EXCEL_PATH}`);
  console.log('');

  // ── 1. Init Supabase ─────────────────────────────────────────────────────

  // Priority: SUPABASE_SERVICE_ROLE_KEY env var > service key in .env > anon key
  let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let keyLabel = 'SUPABASE_SERVICE_ROLE_KEY env var';

  if (!supabaseKey) {
    const envContents = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
    const serviceMatch = envContents.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
    if (serviceMatch) {
      supabaseKey = serviceMatch[1].trim();
      keyLabel = '.env.local SUPABASE_SERVICE_ROLE_KEY';
    }
  }

  if (!supabaseKey) {
    supabaseKey = loadAnonKey();
    keyLabel = 'anon key (RLS restricted)';
  }

  const supabase = createClient(SUPABASE_URL, supabaseKey);
  console.log(`Supabase auth: ${keyLabel}`);

  // ── 2. Read Excel ─────────────────────────────────────────────────────────

  console.log('Reading Excel file...');
  let wb, rows;
  try {
    wb = XLSX.readFile(EXCEL_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    console.log(`  Raw rows in sheet "${wb.SheetNames[0]}": ${rows.length}`);
  } catch (err) {
    console.error('ERROR reading Excel:', err.message);
    process.exit(1);
  }

  // ── 3. Parse records ──────────────────────────────────────────────────────

  console.log('Parsing customer records...');
  const records = parseExcelRows(rows);
  console.log(`  Customer records found: ${records.length}`);

  const skipped = records.filter((r) => r.valid_status === 'skipped');
  const withPlates = records.filter((r) => r.plate_number);
  const withoutPlates = records.filter((r) => r.valid_status !== 'skipped' && !r.plate_number);
  console.log(`  Records with plate numbers: ${withPlates.length}`);
  console.log(`  Records without plate data: ${withoutPlates.length}`);
  console.log(`  Rejected/skipped records:   ${skipped.length}`);

  // ── 4. Load existing customers from Supabase ──────────────────────────────

  console.log('\nLoading existing customers from Supabase...');
  let existingCustomers = [];
  let fetchError = null;

  // Fetch in pages (customers table may have >1000 rows)
  const PAGE_SIZE = 1000;
  let page = 0;
  let total = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('customers')
      .select('customer_id, company_name, customer_code')
      .range(from, to);

    if (error) {
      fetchError = error;
      break;
    }
    if (!data || data.length === 0) break;

    existingCustomers = existingCustomers.concat(data);
    total += data.length;
    process.stdout.write(`\r  Fetched ${total} customers...`);
    page++;
  }

  console.log(`\n  Total customers in DB: ${existingCustomers.length}`);
  if (fetchError) {
    console.error('ERROR fetching customers:', fetchError.message);
    process.exit(1);
  }

  if (existingCustomers.length === 0) {
    console.error('');
    console.error('ERROR: No customers found in the database. This is likely one of:');
    console.error('  1. RLS policies are blocking the anon key (most likely)');
    console.error('  2. The customers table is actually empty');
    console.error('');
    console.error('To fix, run with: SUPABASE_SERVICE_ROLE_KEY="your_key" node scripts/backfill-vehicles.mjs');
    console.error('');
    console.error('Find the service role key in your Supabase dashboard:');
    console.error('  Project Settings > API > Project API keys > service_role key');
    process.exit(1);
  }

  // ── 5. Build lookup ───────────────────────────────────────────────────────

  // Build multiple lookup strategies:
  //   1. Exact company_name match (case-insensitive)
  //   2. customer_code match
  //   3. Normalised company_name match

  const lookupByCode = {};
  const lookupByName = {};
  const lookupByNormalised = {};

  for (const c of existingCustomers) {
    if (c.customer_code) lookupByCode[c.customer_code.toLowerCase()] = c;
    if (c.company_name) {
      lookupByName[c.company_name.toLowerCase()] = c;
      lookupByNormalised[normaliseCompanyName(c.company_name)] = c;
    }
  }

  // ── 6. Match and plan inserts ────────────────────────────────────────────

  const matched = [];       // { record, customer, matchMethod }
  const notFound = [];      // records that couldn't be matched to any customer
  const duplicatePlates = []; // records where plate already exists in DB

  console.log('\nMatching records to customers...');

  for (const record of records) {
    if (record.valid_status === 'skipped') continue;

    let customer = null;
    let method = null;

    // Strategy 1: customer_code match
    if (record.customer_code) {
      customer = lookupByCode[record.customer_code.toLowerCase()] || null;
      if (customer) method = 'customer_code';
    }

    // Strategy 2: exact company_name ILIKE match
    if (!customer && record.company_name) {
      customer = lookupByName[record.company_name.toLowerCase()] || null;
      if (customer) method = 'company_name_exact';
    }

    // Strategy 3: normalised company_name match
    if (!customer && record.company_name) {
      const normalised = normaliseCompanyName(record.company_name);
      customer = lookupByNormalised[normalised] || null;
      if (customer) method = 'company_name_normalised';
    }

    // Strategy 4: try without leading/trailing whitespace
    if (!customer && record.company_name) {
      // Try matching just the first word group before any special chars
      for (const [key, c] of Object.entries(lookupByName)) {
        const recName = record.company_name.toLowerCase();
        const dbName = c.company_name.toLowerCase();
        // Check if one contains the other
        if (recName.includes(dbName) || dbName.includes(recName)) {
          // Only match if the shorter is substantial (>5 chars)
          const shorter = recName.length < dbName.length ? recName : dbName;
          if (shorter.length >= 5) {
            customer = c;
            method = 'company_name_fuzzy';
            break;
          }
        }
      }
    }

    if (customer) {
      matched.push({ record, customer, matchMethod: method });

      // For dry run: check if plate already exists (if we were going to insert)
      if (record.plate_number && !isExecute) {
        // Will check during execute phase
      }
    } else {
      notFound.push(record);
    }
  }

  // ── 7. Check for duplicate plates (execute mode) ─────────────────────────

  const vehiclesToCreate = [];

  if (isExecute) {
    // Check which plates already exist in the vehicles table
    const plates = matched
      .filter((m) => m.record.plate_number)
      .map((m) => m.record.plate_number);

    if (plates.length > 0) {
      console.log('\nChecking for duplicate plates in vehicles table...');
      const { data: existingVehicles, error: vehError } = await supabase
        .from('vehicles')
        .select('plate_number')
        .in('plate_number', plates);

      if (vehError) {
        console.error('ERROR checking plates:', vehError.message);
        process.exit(1);
      }

      const existingPlateSet = new Set(
        (existingVehicles || []).map((v) => v.plate_number)
      );

      for (const match of matched) {
        if (match.record.plate_number) {
          if (existingPlateSet.has(match.record.plate_number)) {
            duplicatePlates.push(match);
          } else {
            vehiclesToCreate.push(match);
          }
        }
      }
    }
  } else {
    // Dry run: all matched records with plates are candidates
    for (const match of matched) {
      if (match.record.plate_number) {
        vehiclesToCreate.push(match);
      }
    }
  }

  // ── 8. Create vehicles (execute mode only) ───────────────────────────────

  let vehiclesCreated = 0;
  let insertErrors = 0;

  if (isExecute && vehiclesToCreate.length > 0) {
    console.log('\nCreating vehicles...');

    for (let idx = 0; idx < vehiclesToCreate.length; idx++) {
      const { record, customer } = vehiclesToCreate[idx];

      const vehiclePayload = {
        customer_id: customer.customer_id,
        plate_number: record.plate_number,
        chassis_no: `PENDING-${record.plate_number}`,
        engine_no: `PENDING-${record.plate_number}`,
        maker: 'HINO',
        model_code: record.model_code || 'Truck',
        body_type: record.body_type || null,
        status: 'active',
      };

      const { error: insertError } = await supabase
        .from('vehicles')
        .insert(vehiclePayload);

      if (insertError) {
        console.error(`  ERROR [${idx + 1}/${vehiclesToCreate.length}] ${record.plate_number} for ${customer.company_name}: ${insertError.message}`);
        insertErrors++;
      } else {
        vehiclesCreated++;
      }

      if ((idx + 1) % 100 === 0) {
        console.log(`  Progress: ${idx + 1}/${vehiclesToCreate.length} processed`);
      }
    }
  } else if (!isExecute && vehiclesToCreate.length > 0) {
    console.log('\n[DRY RUN] Vehicles that WOULD be created:');
    for (const { record, customer, matchMethod } of vehiclesToCreate.slice(0, 25)) {
      console.log(
        `  Plate: ${record.plate_number} | Customer: ${customer.company_name} (code: ${customer.customer_code || 'N/A'}) | Match: ${matchMethod}`
      );
    }
    if (vehiclesToCreate.length > 25) {
      console.log(`  ... and ${vehiclesToCreate.length - 25} more`);
    }
  }

  // ── 9. Report not-found records ──────────────────────────────────────────

  if (notFound.length > 0) {
    console.log(`\n${isExecute ? '' : '[DRY RUN] '}Records with NO matching customer (${notFound.length}):`);
    for (const record of notFound.slice(0, 20)) {
      console.log(`  Code: ${record.customer_code} | Company: ${record.company_name} | Plate: ${record.plate_number || '—'}`);
    }
    if (notFound.length > 20) {
      console.log(`  ... and ${notFound.length - 20} more`);
    }
  }

  // ── 10. Summary ──────────────────────────────────────────────────────────

  console.log('');
  console.log('═══ SUMMARY ═══');
  console.log('');
  console.log(`  Total Excel records parsed:      ${records.length}`);
  console.log(`  Skipped (rejected customer):     ${skipped.length}`);
  console.log(`  Records with plate data:         ${withPlates.length}`);
  console.log(`  Records without plate data:      ${withoutPlates.length}`);
  console.log('');
  console.log(`  Customers matched in DB:         ${matched.length}`);
  console.log(`  Customers NOT found in DB:       ${notFound.length}`);
  console.log('');

  if (isExecute) {
    console.log(`  Vehicles created:                ${vehiclesCreated}`);
    console.log(`  Vehicle insert errors:           ${insertErrors}`);
    console.log(`  Duplicate plates skipped:        ${duplicatePlates.length}`);
  } else {
    console.log(`  Vehicles to create (candidates): ${vehiclesToCreate.length}`);
    console.log(`  Duplicate plate checks:          will be checked at execute time`);
    console.log('');
    console.log('  Run with --execute to insert vehicles.');
  }

  console.log('');
  console.log(`  Match methods breakdown:`);
  const methodCounts = {};
  for (const m of matched) {
    methodCounts[m.matchMethod] = (methodCounts[m.matchMethod] || 0) + 1;
  }
  for (const [method, count] of Object.entries(methodCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${method}: ${count}`);
  }

  console.log('');
  if (isExecute) {
    console.log('✅ Execute complete.');
  } else {
    console.log('⚠️  Dry run — no changes made. Pass --execute to commit.');
  }
}

main().catch((err) => {
  console.error('UNHANDLED ERROR:', err);
  process.exit(1);
});
