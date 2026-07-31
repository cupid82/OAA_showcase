# 04 — Admin Module

> ⚠️ Outline only. Paste your Obsidian note 04 over this file.
> Used by Step 9 (admin console) and Step 11 (events).

## Dashboard — `/admin`

Summary counts: students, teachers, departments, subjects, today's attendance %.

## Students

- CRUD + filters (department / year / semester) + CSV export.
- **Bulk CSV import** — the real account-creation path. Students cannot self-register.
- TODO: exact CSV column list and validation rules
- TODO: what is the initial password? Forced change on first login?

## Teachers

- CRUD, department assignment, subject assignment, password reset.

## Departments & subjects

- CRUD. Subjects belong to a department + semester and carry a max-marks value.

## Academics

- Marks approval, lock semester results.
- TODO: what does "locked" prevent exactly?

## Settings

- Academic year, current semester, OAA weights, attendance threshold,
  leaderboard privacy toggle.
- OAA weights are read by the engine at compute time — never hardcoded.

## Events

- Create / edit / delete, poster upload, publish notifications.

## Rules

- Every admin mutation writes an `audit_logs` row.
- Confirmation dialog on every delete.
