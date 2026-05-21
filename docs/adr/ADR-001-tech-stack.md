# ADR-001: Technology Stack Selection

| Field | Value |
|---|---|
| Date | 2026-05-20 |
| Status | Accepted |
| Supersedes | — |

## Context

Module 1 needs a customer and fleet database accessible to SSME staff on desktop browsers. It serves as the data backbone for all 10 SSME Hub modules.

## Decision

React 19 + Vite 8 + Tailwind CSS 4 for the frontend. Supabase (PostgreSQL + Auth + Storage + RLS) for the backend. Cloudflare Workers for hosting.

## Alternatives Evaluated

| Option | Reason Rejected |
|---|---|
| Next.js | SSR adds complexity for an internal desktop-first app with no SEO requirement |
| Firebase | NoSQL schema mismatch for relational fleet data; Supabase PostgreSQL fits the domain |
| Vercel | SSME Hub is already on Cloudflare; Workers keeps all modules on one platform |
| Custom auth | Supabase Auth + RLS bundled; custom auth adds maintenance for a 4-role internal system |

## Consequences

Positive: RLS at the DB layer means the frontend cannot bypass access controls. Supabase Storage + DB in one platform simplifies document management. Cloudflare Workers edge deployment gives low latency in Malaysia.

Negative: Supabase vendor lock-in for auth and storage. Cloudflare Workers has a 1 MB script size limit.

Risks: Supabase free tier limits (mitigated by pro plan). Workers cold-start latency (target < 50 ms, see `docs/perf-budgets.md`).

## Review Trigger

Revisit if Supabase pricing changes materially, or if a module requires server-side rendering.
