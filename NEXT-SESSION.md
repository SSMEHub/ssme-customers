# NEXT SESSION
Updated: 2026-05-23 (end of session)

## Where we are
Routing FIXED and deployed. All 4 routes work with direct URL navigation. Build `Duqy5Q7N` on Cloudflare Workers. 58 commits pushed to GitHub. 9/10 critical bugs resolved.

## Routing fix (this session)
`ReturnToRedirect` placed `<Navigate>` outside `<Routes>` via React fragment — broke React Router v7 matching. Replaced with useEffect + useNavigate in App, removed fragment wrapper.

## Status
| # | Problem | Status |
|---|---------|--------|
| 1 | 1000-record limit | Code fixed, server cap at 1000 — needs SQL |
| 2 | Search bar broken | Fixed + deployed |
| 3 | Routing | **FIXED this session** |
| 4 | Dashboard misleading text | Fixed + deployed |
| 5 | promote_import_batch | Fixed — migration 012 pushed |
| 6 | Import column mapping | Fixed + deployed |
| 7 | getImportBatch columns | Fixed + deployed |
| 8 | Error UI | Fixed + deployed |
| 9 | Entity type filter | Fixed + deployed |
| 10 | Login returnTo | **FIXED this session** |

## PENDING — user action needed
1. **1000-row limit** — run SQL: `ALTER ROLE authenticator SET pgrst.max_rows = 5000; NOTIFY pgrst, 'reload config';` at https://supabase.com/dashboard/project/gruvcmbsvoauhftfcoio/sql/new
2. **Permission prompts** — add Bash wildcards to `.claude/settings.local.json` (auto-mode blocked)
3. **Vehicle backfill** — current Excel is customer listing, not vehicle data. Need Jason's vehicle Excel
4. **Import page E2E test** — upload Excel through browser

## Key info
- **Deployed:** `https://ssme-customers.soonsengmotorsenterprise.workers.dev`
- **Supabase:** `gruvcmbsvoauhftfcoio.supabase.co` (ssme-hub)
- **Login:** `jason@ssmehub.com` / `Ssme2025!`
- **Get service role key:** `npx supabase projects api-keys --project-ref gruvcmbsvoauhftfcoio -o json`
