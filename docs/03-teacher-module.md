# 03 — Teacher Module

> ⚠️ Outline only. Paste your Obsidian note 03 over this file.
> Used by Step 6 (teacher write path).

## Dashboard — `/teacher`

- TODO: which summary cards (my classes, today's periods, pending marks entry…)

## My classes

- Subjects assigned to this teacher, with department / semester / section.
- TODO: how is a teacher assigned to a subject+section? (admin only?)

## Attendance — `/teacher/attendance`

- Pick subject + date → class roster → present/absent toggles → bulk submit.
- Mark-all-present shortcut.
- One row per (student, subject, date). Duplicate submit → 409.
- TODO: can attendance be marked for a past date? How far back?
- TODO: who may edit an already-submitted record — the teacher, or admin only?

## Marks — `/teacher/marks`

- Spreadsheet-style entry grid.
- Marks cannot exceed the subject max.
- TODO: internal/external split and max values
- TODO: are marks locked after admin approval? (Step 9 says yes — confirm)

## Students — `/teacher/students`

- Search by ID / name / department / semester, plus student detail view.
- A teacher may only touch students in classes assigned to them.

## Assessments

- Adaptability: 7 sub-criteria, teacher-rated. See `07-oaa-spec.md`.
- Social contribution records.
- Both write an `audit_logs` row.
- TODO: how often are these rated — per semester, per month?
