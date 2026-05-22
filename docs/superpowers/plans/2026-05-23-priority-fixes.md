# Top 5 Priority Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** Close the 5 highest-priority loose ends: stale session doc, uncommitted migration, Storage atomicity gap, untracked mockup, temp file cleanup.

**Architecture:** 5 independent single-file tasks, each dispatched as a parallel subagent. Each commits atomically.

---

### Task 1: Rewrite NEXT-SESSION.md

**Files:** Modify: `NEXT-SESSION.md`

All 16 UI tasks are committed. Rewrite to reflect actual state.

### Task 2: Commit migration 011

**Files:** `supabase/migrations/011_contacts_credithold_hardcopy.sql`

164-line migration adding permit_pma, credit hold, customer_contacts, driver fields, hardcopy tracking. Uses IF NOT EXISTS — safe to re-run.

### Task 3: Fix uploadDocument atomicity

**Files:** Modify: `src/lib/db/documents.js:49-72`

`uploadDocument` uploads to Supabase Storage then inserts DB row. If DB insert fails, the Storage file is orphaned. Wrap DB insert in try/catch — on failure, delete the uploaded file from Storage before re-throwing.

### Task 4: Commit mockup/

**Files:** `mockup/index.html`

7312-line rebuilt mockup. Commit as reference material.

### Task 5: Gitignore supabase/.temp/

**Files:** Modify: `.gitignore`

Add `supabase/.temp/` to `.gitignore`. The one temp file is Supabase CLI context, never meant for version control.
