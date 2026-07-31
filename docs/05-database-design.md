# 05 — Database Design

> ⚠️ Outline only. Paste your Obsidian note 05 over this file **before Step 1**.
> Step 1 shapes every table in the project from this document.

## Corrections that override the original note

These come from `08-build-roadmap.md`, Phase 1, and win over anything in the note:

1. `attendance` has a **date** column — unique on (student_id, subject_id, date).
   Never a running counter.
2. `students` stores **no** `oaa`, `cgpa`, or `attendance_percent` columns.
   All three are derived.
3. `departments`, `subjects`, `semesters` are real tables, not text strings.
4. Add OAA input tables: `oaa_scores`, `adaptability_assessments`,
   `physical_records`, `social_records`.
5. Add `audit_logs`.
6. One `users` table holds auth for all three roles; `students`, `teachers`,
   `admins` reference it.

## Tables

### users

`id`, `login_id`, `password_hash`, `role` (student|teacher|admin), `is_active`,
`created_at`, `updated_at`.

### students

`id`, `user_id` → users, `roll_no` (unique), `name`, `department_id`, `semester_id`,
`section`, `admission_year`, plus profile fields.
TODO: full profile field list.

### teachers / admins

TODO: field lists.

### departments, subjects, semesters

TODO: does a subject belong to (department, semester) or to a course?
TODO: subject max marks — internal and external.

### marks

`id`, `student_id`, `subject_id`, `semester_id`, `internal`, `external`,
`created_at`, `updated_at`.
TODO: is there an exam_type (mid1 / mid2 / final)?

### attendance

`id`, `student_id`, `subject_id`, `date`, `status` (present|absent|late?),
`marked_by` → teachers.
Unique: (student_id, subject_id, date).
TODO: is `late` a status, and does it count as present?

### oaa_scores, adaptability_assessments, physical_records, social_records

See `07-oaa-spec.md`.

### audit_logs

`id`, `actor_user_id`, `action`, `entity`, `entity_id`, `before`, `after`,
`created_at`.

### settings

Key/value, holds OAA weights, attendance threshold, current academic year.

## TODO — open questions

- TODO: soft delete or hard delete?
- TODO: multi-year data — do students carry semester history across years?
