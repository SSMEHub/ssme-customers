# BACKLOG — SSME Customers — audit-001 — 2026-05-21

Medium + Low defects deferred from Phase 3. Triage manually.

---

**DEFECT-004** STD-03 Medium — No Prettier config, no pre-commit hook enforcing lint+format.
Suggested fix: Add .prettierrc, install husky + lint-staged, add pre-commit hook.

**DEFECT-012** STD-07 Medium — No .nvmrc (covered in PLAN.md Agent B — actually promoted to High-adjacent, included in plan).

**DEFECT-013** STD-08 Medium — README is Vite template boilerplate. (Covered by DEFECT-027 High fix in PLAN.md.)

**DEFECT-014** STD-08 Low — src/assets/react.svg, vite.svg are unused Vite template artifacts.
Suggested fix: Remove after UI build confirms they are not referenced.

**DEFECT-018** STD-10 Medium — No fast-check property-based tests.
Suggested fix: Add fast-check PBT for plate normalisation and filePath construction after test suite is established.

**DEFECT-020** STD-12 Medium — No CI workflow (.github/workflows/ci.yml missing).
Suggested fix: Add GitHub Actions workflow running lint + build + test after tests exist.

**DEFECT-022** STD-14 Medium — No client-side error handler. (Partially covered by DEFECT-023 fix in PLAN.md Agent C.)

**DEFECT-030** STD-29 Medium — No PR template, no DECISIONS.log. (Covered in PLAN.md Agent B — promoted to plan.)
