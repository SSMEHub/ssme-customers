# Runbook: Storage Bucket Missing

**Symptom:** `uploadDocument()` throws "Bucket not found" or "Object not found".

**Root cause:** The `vehicle-documents` Storage bucket has not been created. This is a one-time manual setup step not covered by migrations.

## Fix

1. Supabase Dashboard → Storage → New Bucket
2. Name: `vehicle-documents`
3. Public access: **OFF** (private — access controlled by RLS policies)
4. Save

## Verification

Upload a test document via the app. Check Supabase Dashboard → Storage → vehicle-documents for the file.

## Note

Migration 011 (pending) will add RLS policies for this bucket. Until then the bucket is accessible to any authenticated user. Do not use in production until Migration 011 is applied.
