# 03 — Teacher Module

Built by Step 6 (teacher write path).

> **Status: classes, attendance, marks entry and student search are built and
> live.** The values in "Resolved defaults" below were chosen during the build
> because the spec left them open — they are working assumptions, not college
> regulations. Each one names the file that owns it, so correcting a value is a
> one-line change.

## The unit of authority: a class

A **class** is one subject taught to one section — a row in
`teacherAssignments`. Everything in this module is keyed to it:

- A teacher may mark attendance or enter marks only for classes on their own
  list. `assertOwnsClass` in `backend/src/services/teacher.service.ts` is the
  single check, and every write goes through it.
- The subject and section selectors in the UI are built from the same list, so a
  class a teacher does not own is not merely rejected — it is never offered.
- Verified: `TCH01` writing marks for CS504 (assigned to `TCH02`) returns **403**.

## Resolved defaults

| Decision                        | Value chosen                                               | Owned by                                       |
| ------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| Teacher → subject assignment    | **Admin only**, via `teacherAssignments`; seeded for now   | `backend/src/data/seed.ts` (Step 9 for UI)     |
| Backdating attendance           | **30 days**, never into the future                         | `ATTENDANCE_BACKDATE_DAYS` in the service      |
| Who may edit a submitted record | The **assigned teacher**, within the same 30-day window    | `updateAttendance` in the service              |
| Internal / external max         | **40 / 60**, per subject, not a constant                   | `SubjectRow` in `backend/src/data/types.ts`    |
| Marks locking after approval    | **Not implemented** — no approval step exists until Step 9 | Step 9                                         |
| Dashboard cards                 | Classes, subjects, students, unmarked-today, recent edits  | `frontend/src/pages/teacher/DashboardPage.tsx` |

## Dashboard — `/teacher`

`GET /api/teachers/me`. Class / subject / student counts, the classes with no
attendance recorded for today, and the teacher's own recent audited changes.

The unmarked-today list is the actual to-do: each row deep-links into the
attendance page with that class already selected.

## My classes — `/teacher/classes`

`GET /api/teachers/me/classes`. One card per `(subject, section)` with its
student count and whether attendance exists for today.

## Attendance — `/teacher/attendance`

`GET /api/attendance?subjectId=&section=&date=` then `POST /api/attendance/bulk`.

- Pick subject + date → class roster → present/absent toggles → bulk submit.
- Mark-all-present shortcut; an unmarked roster defaults to everyone present, so
  the teacher only corrects the exceptions.
- One row per (student, subject, date). A repeat submission is a **409**, checked
  before anything is written, so a half-applied batch cannot happen. The message
  names the students already marked.
- Once a class is marked, the page switches to edit mode: changing a student
  saves immediately via `PATCH /api/attendance/:id` and writes an audit row.
- Each row shows the student's running percentage in that subject, so the teacher
  can see who is at risk while marking.
- Present and absent are two explicit choices, never a checkbox — "unmarked" must
  not look like "absent", because the difference decides whether a percentage is
  computed at all.

## Marks — `/teacher/marks`

`GET /api/marks?subjectId=&section=`, then `POST /api/marks` for a student with
no record and `PATCH /api/marks/:id` for one that has.

- Spreadsheet-style grid: roll · name · internal · external · total · grade.
- Marks cannot exceed the subject's own maximum. Checked in the browser _and_
  rejected by the server — the ceiling is per-subject data, so it lives on the
  subject row, not in a schema constant.
- Totals and grades are derived on read and shown greyed while a row is unsaved.
  Nothing aggregate is stored, so nothing aggregate can drift.
- Saves run sequentially: each write persists the whole JSON document, so
  overlapping writes would race on the same file.

## Students — `/teacher/students`

`GET /api/teachers/students?q=&subjectId=`. Debounced search over roll number and
name, filterable by class, restricted to students in the teacher's own classes.

`/teacher/students/:studentId` is the detail view — profile, CGPA, attendance by
subject and current-semester marks, read through the same `/api/students/:id`
endpoints the student's own pages use. Nothing there is editable; corrections are
made on the attendance and marks pages, where the ownership check applies.

## Assessments — `/teacher/assessments`

**Built.** `GET /api/teachers/assessments?semester=`, then
`POST /api/teachers/assessments/adaptability` and
`POST /api/teachers/records/social`.

- Adaptability: seven sub-criteria, each rated 1–5. See `07-oaa-spec.md` — the
  seven were **invented** during the build, not taken from a rubric.
- All seven are submitted together. A partial rating would average against
  criteria the teacher never considered.
- Re-rating **replaces that teacher's own** previous assessment rather than adding
  a second one, so a correction never double-weights their opinion. Different
  teachers rating the same student _are_ averaged.
- Social contribution records add points, 1–25 each.
- Both write an audit row and both trigger an OAA recompute for that student.
- Scoped to students in the teacher's own classes, same as every other write.
- ⚠️ **Resolved:** rated **per semester**. The page has a semester selector.

## Audit trail

Every teacher write appends to `auditLogs` through
`backend/src/services/audit.service.ts`, recording the actor, the action, the
student, and the full before/after. The table is append-only: a correction is a
new row, never an edit of an old one, because a trail that can be rewritten
proves nothing.

## Seeded staff

| Staff ID | Name                | Subjects    | Password   |
| -------- | ------------------- | ----------- | ---------- |
| TCH01    | Dr. Rajesh Menon    | CS501–CS503 | teacher123 |
| TCH02    | Dr. Anita Deshpande | CS504–CS505 | teacher123 |

Two teachers, deliberately. The whole write path is gated on "is this class
yours", and a single teacher who owned everything would let that check pass by
accident.
