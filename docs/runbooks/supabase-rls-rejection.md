# Runbook: Supabase RLS Rejection (403)

**Symptom:** API call returns 403 or error message "new row violates row-level security policy" or "permission denied for table X".

**Root cause:** The authenticated user has no role set in their JWT metadata, or `get_user_role()` is returning null.

## Diagnostic

In Supabase Dashboard → SQL Editor, run as the affected user:
```sql
SELECT get_user_role();
```
Expected: one of `admin`, `finance`, `sales`, `workshop`. If null, the user has no role assigned.

## Fix

1. Supabase Dashboard → Authentication → Users
2. Find the affected user → Edit
3. Set `user_metadata.role` to one of: `admin`, `finance`, `sales`, `workshop`
4. User must sign out and sign back in to get a refreshed JWT with the new role.

## Verification

Retry the operation that returned 403. It should succeed.

## Prevention

When creating new users, always set the `role` field in user metadata before the user's first login.
