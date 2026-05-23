#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY env var.');
  console.error('Get it from: supabase projects api-keys --project-ref gruvcmbsvoauhftfcoio -o json');
  process.exit(1);
}

const supabase = createClient(
  'https://gruvcmbsvoauhftfcoio.supabase.co',
  serviceKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Test: fetch customer count
const { data, error, count } = await supabase
  .from('customers')
  .select('*', { count: 'exact', head: true });

if (error) {
  console.error('Connection failed:', error.message);
  process.exit(1);
}

console.log(`Connected. Customer count from DB: ${count}`);
console.log(`If count > 1000 and Supabase caps at 1000, need to increase max_rows.`);
console.log(`Run this SQL in Supabase Dashboard SQL Editor:`);
console.log(`  ALTER ROLE authenticator SET pgrst.max_rows = 5000;`);
console.log(`  NOTIFY pgrst, 'reload config';`);
console.log(`Dashboard: https://supabase.com/dashboard/project/gruvcmbsvoauhftfcoio/sql/new`);
