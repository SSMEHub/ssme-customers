# SSME Customers — Module 1

**Owner:** Jason, Soon Seng Motors Enterprise (1988) Sdn. Bhd., Kota Bharu, Kelantan
**Stack:** React + Tailwind CSS + Vite, Supabase (PostgreSQL)
**Part of:** SSME Hub (ssmehub.com) — Module 1 of 10
**GitHub:** SSMEHub org ONLY — never JasonSSKB or GeneralMax618

## Purpose
Customer & Fleet Database. Single source of truth for every customer and vehicle at SSME.
Every other hub module reads from this.

## Key paths
- Supabase project: ssme-hub (gruvcmbsvoauhftfcoio.supabase.co)
- Deploy target: Cloudflare Workers → customers.ssmehub.com
- Working directory: /Users/teckchuan/HINO SSKB/SSME CUSTOMERS

## Rules
- Desktop-first, English only
- Auth via Supabase (roles: admin, finance, sales, workshop)
- GP and financial data: admin + finance only
- GitHub: SSMEHub org ONLY

## Session Startup Checks (MANDATORY — every session)
1. **NotebookLM CLI account** — run `notebooklm list` and verify ONLY these notebooks appear:
   - "SSKB — Commercial Vehicle Quotation &..." (correct account)
   - If unrelated notebooks appear (iGaming/M63/personal projects) → WRONG ACCOUNT → tell user to run `! notebooklm login` and select soonsengmotorsenterprise@gmail.com (red S logo, "Hi, SSKB!")
   - NEVER create notebooks or fire research until account is confirmed correct
2. **Supabase** — confirm project is ssme-hub (gruvcmbsvoauhftfcoio.supabase.co)
3. **GitHub** — confirm remote is SSMEHub org, never JasonSSKB or GeneralMax618

## Domain rules — mandatory variables

| Variable | Allowed values | Reason |
|---|---|---|
| `entity_type` | `sdn_bhd`, `enterprise`, `individual`, `cooperative`, `gov_agency`, `other` | SSM entity classification for Malaysian businesses |
| `id_type` | `ssm`, `ic`, `other` | SSM = company registration; IC = NRIC for individuals |
| `status` (customer) | `active`, `inactive`, `rejected` | `rejected` = failed credit check; never delete customers |
| `doc_type` | `geran`, `insurance`, `road_tax`, `puspakom`, `sld`, `permit_apad`, `permit_lpkp`, `report_awalan`, `invoice_sales`, `invoice_service`, `plan`, `other` | JPJ and PUSPAKOM document types for Malaysian commercial vehicles |
| `role` | `admin`, `finance`, `sales`, `workshop` | RLS enforced at DB level; do not add roles without a migration |
| `gvw_class` | `light`, `medium`, `heavy` | HINO commercial vehicle GVW classification |

## Domain rules — forbidden patterns

- **Never SELECT \* from vehicles without a WHERE clause** — fleet table will grow to thousands of rows
- **Never hardcode role strings** — use enum values above; a typo silently fails RLS
- **Never commit to the Quotation App repo from this session** — separate GitHub accounts
- **Never expose `customer_id` in URL params without auth check** — UUIDs but still sensitive
- **Migration 010 renamed `customers.id` → `customers.customer_id`** — Quotation App must be updated before running migration 010 on shared production DB (see docs/adr/ADR-002)

## Hard Rules

- **Adversarial Verification Gate:** After EVERY batch of subagent work completes, BEFORE committing, dispatch independent verification agents. Each verifier reads actual source files at claimed line numbers, runs build+tests independently, and reports CONFIRMED/REFUTED per claim. No commit before verification complete. Agents lie in completion reports — trust nothing without independent verification.
