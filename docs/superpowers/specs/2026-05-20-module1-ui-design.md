# Module 1 — Customer & Fleet Database UI Spec

**Date:** 2026-05-20
**Status:** Approved for planning
**Owner:** Jason, Soon Seng Motors Enterprise (1988) Sdn. Bhd.
**Repo:** SSMEHub/ssme-customers
**Deploy:** Cloudflare Workers → customers.ssmehub.com

---

## 1. Purpose & Scope

Module 1 is the **data vault** for the entire SSME Hub. It stores and manages customer records, vehicle records, vehicle documents (PDFs), and provides a clean import pipeline for historical SQL Accounting data.

**Module 1 does NOT:**
- Run workshop jobs or job cards (Module 4)
- Do CRM / SLD targeting (Module 3)
- Handle sales quotations (Quotation App)
- Manage parts (Module 5)

Other modules read from Module 1's Supabase tables via the shared database. Module 1's UI is for **data maintenance only** — adding, editing, importing, and keeping documents current.

---

## 2. Design System

**Source:** Airtable design language  
**Theme:** Light — white canvas, `#181d26` ink, `#f8fafc` surface, `#e0e2e6` borders  
**Typography:** System sans-serif (Inter fallback), 14px body, 12px table rows  
**Radius:** 6px cards, 4px inputs, 4px badges  
**Desktop-first.** Minimum viewport: 1280px. No mobile layout.  
**Language:** English only.

**Status badges:**
- Active → green (`#a8d8c4` / `#0a2e0e`)
- In Shop → amber (`#fef3c7` / `#92400e`)
- Decommissioned / Scrapped → grey (`#e0e2e6` / `#41454d`)
- Expired → red (`#fee2e2` / `#991b1b`)
- Expiring (≤30d) → orange (`#fed7aa` / `#9a3412`)
- Warning (31–60d) → yellow (`#fef3c7` / `#854d0e`)
- Valid → green

---

## 3. Navigation

**App shell:** Fixed left sidebar (220px) + top bar (56px) with global search.

**Sidebar items:**
```
SSME [logo]
──────────────
Dashboard
Customers
Vehicles
──────────────
Import          [admin only]
```

**Top bar:** Global search input — searches plate number, chassis number, company name, phone, customer code simultaneously. Results appear as a dropdown with type labels (Vehicle / Customer). Selecting a result navigates directly to that record.

---

## 4. Pages

### 4.1 Dashboard — `/`

The first screen staff sees. Data health view only — not a workflow tool.

**Expiry Alerts table**
- Source: `expiry_alerts_view`
- Columns: Plate, Owner (company name), Doc Type, Expiry Date, Days Left, Status badge
- Grouped: Expired (red) → Critical ≤30d (orange) → Warning 31–60d (yellow)
- Empty state: "All documents are up to date"

**Stats strip (top)**
- Total active customers
- Total active vehicles
- Vehicles with docs expiring in 30 days

**Fleet Age panel**
- Count of vehicles with RRI ≥ 70 (replacement due, ≥7 yrs old)
- Source: `fleet_age_view WHERE replacement_due = true`
- Link: "View all →" goes to `/vehicles?age=replacement`

---

### 4.2 Customers List — `/customers`

**Search:** Full-text by company name, phone, customer code. Debounced 300ms.  
**Filters:** Status (active / inactive / all) · Entity type dropdown  
**Table columns:** Code · Company Name · Entity Type · Phone · Vehicles · Status  
**Sort:** Company name ascending (default)  
**Actions:** `+ Add Customer` button top-right → navigates to `/customers/new`  
**Row click:** Navigates to `/customers/:id`

---

### 4.3 Customer Detail — `/customers/:id`

**Header:** Company name (h1), customer code badge, entity type badge, status badge, phone number  
**Edit button** → `/customers/:id/edit`

**Info section (cards):**
- Contact: phone, email, contact person
- Address: address line 1, address line 2, postcode, city, state
- Identity: IC / SSM number, ID type, notes

**Fleet section (below info):**
- `+ Add Vehicle` button → `/vehicles/new?customer=:id`
- Table: Plate · Maker/Model · Body Type · Reg Year · Status · Age
- Age cell: red badge if `replacement_due = true` (≥7 yrs)
- Row click → `/vehicles/:id`
- Empty state: "No vehicles on record. Add one."

---

### 4.4 Customer Form — `/customers/new` and `/customers/:id/edit`

Breadcrumb: `← Customers` (new) or `← [Company Name]` (edit)  
Single-page form, two-column grid layout.

**Fields:**
| Field | Type | Required |
|---|---|---|
| Company Name | text | ✓ |
| Entity Type | select (Sdn Bhd / Enterprise / Individual / Cooperative / Gov Agency / Other) | ✓ |
| Customer Code | text | — |
| IC / SSM Number | text | — |
| ID Type | select (SSM / IC / Other) | — |
| Phone | text | — |
| Email | email | — |
| Contact Person | text | — |
| Address Line 1 | text | — |
| Address Line 2 | text | — |
| Postcode | text (5 chars) | — |
| City | text | — |
| State | text (default: Kelantan) | — |
| Notes | textarea | — |
| Status | select (Active / Inactive / Rejected) | ✓ |

**Validation:** react-hook-form + zod. Company name required. Entity type required. Status required.  
**Actions:** `Save` (primary) · `Cancel` (navigates back)  
**On success:** Navigate to `/customers/:id` with success toast.

---

### 4.5 Vehicles List — `/vehicles`

**Search:** Plate number, chassis number, company name  
**Filters:** Status · Maker · Age toggle ("≥7 years only")  
**Table columns:** Plate · Maker/Model · Owner · Body Type · Reg Year · Status · Next Expiry  
**Next Expiry:** Earliest expiring document for that vehicle (from `vehicle_documents`). Colour-coded.  
**Row click:** Navigates to `/vehicles/:id`

---

### 4.6 Vehicle Detail — `/vehicles/:id`

Breadcrumb: `← [Customer Company Name]` links back to `/customers/:id`

**Header:** Plate number (large), maker + model, status badge. Edit button → `/vehicles/:id/edit`

**Specs section (two-column cards):**
Chassis No · Engine No · GVW (kg) · Kerb Weight (kg) · Payload (kg) · Fuel Type · Assembly · Body Type · Colour · Manufacture Year · Reg Date · Delivery Date · Completion Date · Body Builder · SQL Account Code · Loan Bank · Loan Tenure (months)

**Document Cabinet (key feature)**

One card per document type. Layout: 3-column grid.

Each card contains:
- Document type name (bold)
- Status badge (Valid / Expiring / Expired / Not Uploaded)
- If uploaded: Doc number · Issue date · Expiry date · Days until expiry
- `View` button — opens PDF in new tab via Supabase Storage signed URL (1-hour TTL)
- `Upload` button — file picker (PDF, JPG, PNG, max 10MB), uploads to Supabase Storage at path `/{vehicle_id}/{doc_type}/{timestamp}_{filename}`, creates/updates `vehicle_documents` row

**Document types (cards always shown, even if empty):**
Geran · Insurance · Road Tax (LKM) · Puspakom · SLD Cert · Permit APAD · Permit LPKP · Report Awalan · Invoice Sales · Invoice Service · Plan · Other

Documents with expiry dates: Insurance (annual), Road Tax (annual), Puspakom (6-monthly), SLD Cert (2-year), Permit APAD (annual), Permit LPKP (annual).

**Upload behaviour:** Multiple versions of the same doc type are kept (history). The most recent upload per type is the "current" one shown on the card. Previous versions accessible via a "History" expandable row.

---

### 4.7 Vehicle Form — `/vehicles/new` and `/vehicles/:id/edit`

Breadcrumb: `← [Customer Name]` (new, pre-linked via `?customer=:id`) or `← [Plate Number]` (edit)

Single-page form, two-column grid, fields grouped into sections.

**Section: Identity**
Plate Number · Chassis No · Engine No

**Section: Specifications (JPJ fields)**
Maker · Model Code (model_id dropdown from vehicle_models, or free text) · Body Type · Colour · GVW (kg) · Kerb Weight (kg) · Payload (kg) · Engine Capacity · Fuel Type · Usage Class · Assembly Type (CKD/CBU) · Manufacture Year · Reg Date

**Section: Delivery**
Delivery Date · Completion Date · Body Builder

**Section: Commercial**
SQL Account Code · Loan Bank · Loan Tenure (months)

**Section: Status**
Status (Active / In Shop / Decommissioned / Scrapped) · Notes

**Validation:** Plate required + unique. Chassis required + unique. Engine required + unique. GVW > Kerb Weight if both present.  
**On success:** Navigate to `/vehicles/:id`

---

### 4.8 Import — `/import` (admin role only)

**Step 1 — Upload**
File picker: `.xlsx` only (PDF import deferred to v2). Max 20MB. On select, the browser parses the file using SheetJS (`xlsx` npm package) — no server required. Parsed rows are batch-inserted into `import_staging` via Supabase JS client.

**Step 2 — Preview (parser output)**
Three tabs:
- **Valid** (green count) — rows ready to import. Table shows parsed values: company name, plate, body type, entity type (inferred).
- **Errors** (red count) — rows that failed. Shows raw value + specific error per field (e.g. "plate: invalid Malaysian format", "reg_date: cannot parse '44635'"). Staff can skip or fix manually.
- **Duplicates** (orange count) — rows where plate or chassis already exists in DB. Shows existing record side-by-side. Staff can skip or force-update.

**Step 3 — Import**
`Import [N] valid rows` button. Runs as a DB transaction — all or nothing. On success, shows import summary (N customers created, N vehicles created, N skipped).

**SQL Accounting account name parser logic:**
Format: `COMPANY NAME - PLATE/MODEL - BODY TYPE`
- Split on ` - ` (space-dash-space)
- Part 1: company name (trim, title-case)
- Part 2: detect if plate (matches MY plate regex) or model code (alphanumeric, no spaces) — flag as `model_code` if not a valid plate
- Part 3: body type (trim)
- `USED` prefix detected → flag `is_second_hand = true`
- `***REJECTED CUSTOMER***` → valid_status = 'skipped' immediately

**Malaysian plate normalisation:**
- Strip all spaces, uppercase
- Validate regex: `^[A-Z]{1,3}[0-9]{1,4}[A-Z]{0,2}$`
- Invalid → error with code `invalid_plate_format`

**Date parsing (tries in order):**
1. ISO: `YYYY-MM-DD`
2. Malaysian: `DD/MM/YYYY`, `D/M/YYYY`, `DD-MM-YYYY`
3. Excel serial: integer 20000–60000 → convert to date
4. Fail → error with code `unparseable_date`

---

## 5. Data Flow

```
[User] → [React UI] → [TanStack Query] → [Supabase JS client]
                                              ↓
                                    [Supabase PostgreSQL]
                                    [Supabase Storage]
                                    [RLS enforced at DB level]
```

**Caching strategy (TanStack Query):**
- `['customers']` — 5 min stale time
- `['customer', id]` — 5 min stale time
- `['vehicles']` — 5 min stale time
- `['vehicle', id]` — 5 min stale time
- `['dashboard-expiry']` — 10 min stale time
- Mutations invalidate relevant query keys immediately

**Document uploads:**
1. Client picks file → uploads directly to Supabase Storage (client-side, using anon key with Storage RLS)
2. On success, client calls `createDocument()` helper to insert row in `vehicle_documents`
3. `file_url` stores the Storage path (not a signed URL) — signed URLs generated on-demand for viewing

---

## 6. Auth & Roles

Auth via Supabase Auth. Role stored in `user_metadata.role` or `app_metadata.role`.

| Role | Customers | Vehicles | Documents | Import |
|---|---|---|---|---|
| admin | read/write | read/write | read/write | access |
| finance | read/write | read only | read/write | — |
| sales | read/write | read/write | read/write | — |
| workshop | read only | read only | read only | — |

RLS enforced at DB level (migration 010). UI hides write controls for roles without permission but DB enforces it regardless.

---

## 7. Tech Stack

| Package | Purpose | Status |
|---|---|---|
| react + vite | UI framework | ✓ installed |
| tailwindcss | Styling | ✓ installed |
| @supabase/supabase-js | DB + Storage + Auth | ✓ installed |
| react-router-dom v6 | Client-side routing | add |
| @tanstack/react-query | Data fetching + caching | add |
| react-hook-form | Form state | add |
| zod | Schema validation | add |

---

## 8. What's Not In This Module

- Changing vehicle status to "In Shop" via a job card → Module 4
- SLD targeting / replacement marketing calls → Module 3 / 9
- Mileage updates from service visits → Module 4 writes to `vehicles.last_mileage_km`
- Ownership transfers UI — schema is ready, UI deferred to v2 (rare operation, admin can use Supabase Dashboard for now)
- Real-time notifications for expiry — deferred, daily dashboard check is sufficient for v1

---

## 9. Storage Bucket RLS

Storage bucket `vehicle-documents` requires two policies (added as migration 011):

```sql
-- All authenticated users can download (view documents)
CREATE POLICY "vehicle_docs_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vehicle-documents');

-- Admin, finance, sales can upload
CREATE POLICY "vehicle_docs_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-documents'
    AND (get_user_role() IN ('admin','finance','sales'))
  );

-- Admin, finance, sales can delete (replace old versions)
CREATE POLICY "vehicle_docs_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vehicle-documents'
    AND (get_user_role() IN ('admin','finance','sales'))
  );
```

## 10. Storage Bucket

Bucket: `vehicle-documents` (private)  
Path structure: `/{vehicle_id}/{doc_type}/{unix_timestamp}_{original_filename}`  
Signed URL TTL: 3600 seconds (1 hour) for viewing  
Max file size: 10MB  
Accepted types: PDF, JPG, PNG, JPEG  
**Bucket must be created manually in Supabase Dashboard before UI build.**
