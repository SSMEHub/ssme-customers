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
