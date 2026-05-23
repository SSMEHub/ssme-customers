# NEXT SESSION
Updated: 2026-05-23 (end of session)

## Where we are
Routing FIXED and deployed. All 4 routes (/customers, /vehicles, /import, Dashboard) now work with both direct URL navigation and client-side links. Login redirect preserves returnTo parameter. Build `Duqy5Q7N` deployed to Cloudflare Workers.

## Root cause of routing bug
`ReturnToRedirect` component placed `<Navigate>` outside `<Routes>` via a React fragment (`<>...</>`). This broke React Router v7's route matching — the catch-all `*` matched everything. Fixed by: removing ReturnToRedirect, using useEffect + useNavigate in App for returnTo handling, removing fragment wrapper.

## Status of fixes
| Problem | Status |
|---|---|
| 1. 1000-record limit | Source has `.limit(5000)` but Supabase PostgREST caps at 1000. Need to increase max_rows server-side or implement pagination |
| 2. Search bar dead | Fixed — deployed |
| 3. Routing (direct URL → Dashboard) | **FIXED this session** — deployed |
| 4. Dashboard misleading text | Fixed — deployed |
| 5. promote_import_batch missing | Fixed — migration 012 pushed |
| 6. Import page column mapping | Fixed — deployed |
| 7. getImportBatch wrong columns | Fixed — deployed |
| 8. Error UI missing | Fixed — deployed |
| 9. Entity type filter | Fixed — deployed |
| 10. Login returnTo lost | **FIXED this session** — deployed |

## PENDING
| Item | Status | Notes |
|---|---|---|
| **GitHub push** | Blocked | Both GeneralMax618 and JasonSSKB forbidden by CLAUDE.md. Need SSMEHub org account. Commit `0f6f4e4` on main waiting to push |
| **1000-record limit** | Partial | Code has `.limit(5000)` but Supabase PostgREST server caps at 1000. Need to `ALTER ROLE authenticator SET pgrst.max_rows = 5000` via SQL or use pagination |
| **Permission prompts** | Blocked | Auto-mode blocked settings.local.json edit 3 times. User must manually add read-only Bash wildcards |
| **Vehicles import** | Blocked | Backfill script ready at `scripts/backfill-vehicles.mjs`. Needs service role key |
| Import page live test | Not tested | Upload Excel through browser Import page |
| Vehicles Excel from Jason | Not received | Separate vehicle data file needed |

## Key info
- **Deployed:** `https://ssme-customers.soonsengmotorsenterprise.workers.dev` (build `Duqy5Q7N`)
- **Supabase:** `gruvcmbsvoauhftfcoio.supabase.co` (ssme-hub)
- **Login:** `jason@ssmehub.com` / `Ssme2025!`
- **Latest commit:** `0f6f4e4` fix: routing — restructure App.jsx to avoid Navigate outside Routes
