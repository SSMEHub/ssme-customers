# NEXT SESSION
Updated: 2026-06-10 (end of session)

## Where we are
Module 1 (Customer & Fleet DB) is ~80% built and deployed. This session: stood up cross-AI tooling (`/council`), did a strategic review + foundation build for Module 1, and built a Claude→DeepSeek failover for the 5-hour subscription limit.

## This session — DONE
- **/council installed for ALL truck projects** (`~/.claude-trucks/skills/council/`), powered by your OpenRouter key in `~/.llm-keys-trucks` (chmod 600). Default panel `gpt,deepseek,kimi` (~2¢/round). NOTE: OpenRouter `/credits` API falsely reports `$0` — the paid seats actually work (proven live).
- **Council strategic review of Module 1** — 5 goals + gap analysis + architecture. Verdict 4×REVISE / 1×RECONSIDER. Findings (verified against the real schema):
  - No `api` contract layer → other modules read raw `public` tables → that's the ADR-002 breakage source.
  - No unique constraint on customer SSM/IC (`id_number`) → duplicates likely among the 2,510.
  - **Quotation App + Module 1 SHARE the `customers` table** (confirmed in `010_module1_full_schema.sql`) → "a new sale auto-adds the customer" is already true; everything links by `customer_id`.
- **Foundation build — branch `feat/m1-foundation`, UNCOMMITTED + UNVERIFIED** (4 parallel agents wrote these):
  - `supabase/migrations/013_api_contract_schema.sql` — `api.customers/vehicles/vehicle_documents/expiry_alerts` views (`security_invoker`), SELECT-only for downstream modules.
  - `supabase/migrations/014_customer_dedup_guard.sql` — `customer_dup_candidates` view (DETECTION ONLY, no auto-merge) + commented-out forward unique index.
  - `supabase/migrations/015_audit_trail.sql` — `audit_log` + triggers on customers/vehicles/vehicle_documents/ownership_transfers.
  - `src/lib/export.js` + Export-to-Excel buttons on `CustomerList.jsx` + `VehicleList.jsx`.
  - `docs/adr/ADR-003-api-contract-layer.md`, `scripts/dedup-report.sql`.
- **Claude↔DeepSeek failover** (the 5h-limit fix) — `ds`/`opus` aliases in `~/.zshrc` (backed up). BOTH paths CLI-verified (`DS_PATH_OK` / `OPUS_PATH_OK`).
  - `ds` → continue this chat on `deepseek-v4-pro`; `opus` → continue on Opus (Pro subscription). Type `ds` at the limit, `opus` after reset.
  - The trucks `sk-ant-` API key is OUT OF CREDIT — `opus` unsets it so Claude Code uses the Keychain Pro subscription.
- Installed LM Studio + Cherry Studio (exploring local/GUI model tools).

## PENDING — next session
1. **Verify + commit the foundation build** (`feat/m1-foundation`): adversarial verification of 013–015 + export (read each file, check SQL, run `npm run build`), THEN atomic commits. Nothing committed yet.
2. **Apply migrations to the shared `ssme-hub` DB — ONLY with a backup + Quotation-App coordination.** They're additive/non-breaking, but it's the shared prod DB (ADR-002 warns).
3. **Dedup:** run `scripts/dedup-report.sql` → review `customer_dup_candidates` → human-approved merge → then enable the forward unique index.
4. **Vehicle backfill** — still BLOCKED on Jason's vehicle Excel (fleet is only 3 rows).
5. **Confirm `opus` across a real limit→reset cycle** in daily use.
6. Fold in the council's failover-reliability findings (council was running at session end → `/tmp/council-failover-out/`).

## Key info
- Deployed: `https://ssme-customers.soonsengmotorsenterprise.workers.dev`
- Supabase: `gruvcmbsvoauhftfcoio.supabase.co` (ssme-hub) — SHARED with the Quotation App
- Login: `jason@ssmehub.com` / `Ssme2025!`
- Branch: `feat/m1-foundation` (off `main`; also carries 4 prior-session uncommitted fixes — commit those separately from the 013–015 work)
- Failover: type `ds` (→ DeepSeek) at the limit, `opus` (→ Opus subscription) on reset
