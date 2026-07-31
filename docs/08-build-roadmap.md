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

Steps 0, 3, 4 done. Steps 1 (database) and 2 (auth) deferred by the owner —
frontend auth currently runs on a mock provider. See `CLAUDE.md` → Current state.
