# 08 — Build Roadmap

> ⚠️ Outline only. Paste your Obsidian note 08 over this file.
> The executable version of this roadmap is `plans.md` at the repo root — that is
> the file to follow step by step. This document holds the _decisions_ behind it.

## 0.2 — Account creation decision

Students **cannot self-register**. Accounts are created by an admin, in bulk, from
CSV (Step 9). There is no public sign-up route, and no "approve pending student"
queue — the import _is_ the approval.

Consequence: the login page has no "create account" link. Don't add one.

## Phase 1 — Database corrections

These override `05-database-design.md` wherever they disagree:

1. `attendance` has a date column, unique on (student, subject, date).
2. No `oaa` / `cgpa` / `attendance_percent` columns on `students` — all derived.
3. `departments`, `subjects`, `semesters` are tables, not text strings.
4. OAA input tables: `oaa_scores`, `adaptability_assessments`, `physical_records`,
   `social_records`.
5. `audit_logs` table.
6. One `users` table for auth across all three roles.

## Phase ordering rationale

- The database comes first because every later table shape depends on it.
- Auth comes second because every route after it is protected.
- The student read-only slice (Step 5) is the de-risking milestone: real login →
  real database → real screen.
- The OAA engine gets tests before UI. A wrong chart is obvious; a wrong score is
  invisible.

## Deferred decisions

- TODO: file storage for posters and assignment submissions — Cloudinary free tier
  vs local disk in dev. Must be settled before Step 11.
- TODO: deployment targets — Vercel (frontend) / Render (backend) / Neon or
  Supabase (database). Confirm before Step 15.

## Current status

Steps 0, 2, 3, 4, 5 and 6 done. Step 1 was answered differently: the project
persists to a JSON document rather than Postgres, so the schema work lives in
`backend/src/data/types.ts` and `store.ts` is the seam a real database would
replace. Auth is real — the mock provider is gone. Step 7 (the OAA engine) is
next. See `CLAUDE.md` → Current state.

Phase 1's corrections above are implemented as far as the built modules need
them: dated attendance rows (1), no stored aggregates (2), the OAA input tables
(4) still to come with Step 7, `audit_logs` (5) and one `users` table (6) exist.
Departments, subjects and semesters (3) are subject rows plus string fields, not
separate tables — revisit if the admin console needs to manage them as entities.
