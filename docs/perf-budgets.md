# Performance Budgets — SSME Customers

Last updated: 2026-05-21

## Supabase query targets

| Operation | Target p99 | Breach action |
|---|---|---|
| `getCustomers()` full list | < 500 ms | Add pagination; check GIN index on company_name |
| `getCustomerById()` with vehicles join | < 300 ms | Check FK index on vehicles.customer_id |
| `getVehicleByPlate()` with docs join | < 200 ms | Check index on vehicles.plate_number |
| `getExpiryAlerts()` expiry_alerts_view | < 400 ms | Check index on vehicle_documents.expiry_date |
| `uploadDocument()` Storage + DB | < 5 s for 10 MB file | Check network; check Supabase Storage region |

## Cloudflare Workers

| Metric | Budget | Notes |
|---|---|---|
| Cold start | < 50 ms | Workers-sites; no Node.js runtime |
| Script size | < 800 KB | Limit is 1 MB; monitor with `wrangler deploy --dry-run` |

## Frontend

| Metric | Budget | Notes |
|---|---|---|
| Initial bundle | < 300 KB gzip | Check with `npm run build` output |
| File upload size | 10 MB max | Enforced in `documents.js` `MAX_FILE_BYTES` constant |
| Allowed file types | PDF, JPEG, PNG | Enforced in `documents.js` `ALLOWED_MIME_TYPES` constant |
