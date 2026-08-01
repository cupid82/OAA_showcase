# 02 — Student Module

Built by Step 5 (read-only slice). Events are added by Step 11.

> **Status: profile, marks and attendance are built and live.** The values in
> "Resolved defaults" below were chosen during the build because the spec left
> them open — they are working assumptions, not college regulations. Each one
> names the file that owns it, so correcting a value is a one-line change.

## v1 dashboard scope

Cards: Profile · Marks · Attendance · OAA · Leaderboard · Timetable ·
Announcements · Events · Assignments.
Out of scope for v1: Fee, Library, Placement, Clubs.

Live today: **Profile, Marks, Attendance.** The rest are routed and reachable but
render an empty "built in Step N" page — no placeholder data.

## Resolved defaults

Every one of these replaced a `TODO:` in the original outline. Change the value in
the file named, and everything derived from it follows.

| Decision                | Value chosen                                        | Owned by                                     |
| ----------------------- | --------------------------------------------------- | -------------------------------------------- |
| Attendance threshold    | **75%**                                             | `backend/src/services/student.service.ts`    |
| Internal / external max | **40 / 60**, total 100                              | per subject, in `backend/src/data/seed.ts`   |
| Grade bands             | 10-point: O 90+, A+ 80, A 70, B+ 60, B 50, C 40, F  | `backend/src/lib/grading.ts`                 |
| Grade rounding          | round to nearest integer **before** band lookup     | `backend/src/lib/grading.ts`                 |
| CGPA / SGPA             | credit-weighted mean of grade points, 2 dp          | `backend/src/lib/grading.ts`                 |
| Marks grade table       | **separate** from the OAA grade table in `07`       | see note below                               |
| Student-editable fields | **none** — the whole profile is read-only in v1     | `frontend/src/pages/student/ProfilePage.tsx` |
| Dated attendance rows   | shown — aggregates plus the 10 most recent absences | `backend/src/services/student.service.ts`    |

### Why the two grade tables are separate

`07-oaa-spec.md` grades a 0–100 **ability score**; this module grades a subject's
**total marks**. They are deliberately different tables in different files so that
retuning one cannot silently move the other. If the college's regulations say they
are the same table, merge them — but make that an explicit decision.

## Profile — `/student/profile`

Read-only. `GET /api/students/me`.

Fields on record: roll number, name, date of birth, gender, department, semester,
year (derived — `ceil(semester / 2)`), section, admission year, blood group,
email, phone, address, guardian name, guardian phone, photo.

- Photo is `null` until file upload exists; the UI falls back to initials.
- **Students cannot edit any field.** Corrections go through the college office.
  This is the conservative default — Step 5 is specified as a read-only slice.
  If self-service editing is wanted, the likely set is phone / address / guardian
  phone, and it needs an `audit_logs` row per change.

## Marks — `/student/marks`

`GET /api/students/me/marks`. Subject-wise, grouped by semester, newest last.

Columns: code · subject · credits · internal (/40) · external (/60) · total (/100)
· grade. Each semester shows its credit total and SGPA; the page header shows CGPA
across all semesters.

- Grades, SGPA and CGPA are **derived on read** from the marks rows. Nothing
  aggregate is stored, so nothing aggregate can drift.
- `null` CGPA means "no graded credits yet" and renders as `—`, not `0.00`.
- The table scrolls inside its own box on narrow screens; the page never scrolls
  horizontally.

## Attendance — `/student/attendance`

`GET /api/students/me/attendance`. Overall %, per-subject breakdown, monthly trend
bar chart (Recharts), and the most recent absences.

- Counted from **one row per student, per subject, per date** — never a stored
  counter. A teacher's correction shows up on the next page load.
- A red banner appears below 75%, and the threshold is drawn on the chart and on
  every per-subject bar, so the shortfall is never signalled by colour alone.
- Percentages are rounded to one decimal. Zero classes held reads as 0%, not NaN,
  and suppresses the banner — no classes yet is not a shortfall.

## OAA — `/student/oaa`

**Built.** `GET /api/students/me/oaa`. Score gauge, the four-dimension radar with
the class average as a context series, semester trend, strongest/weakest cards
with advice, and the records that fed each dimension.

The grade table and the seven adaptability sub-criteria were **invented** during
the build rather than taken from college regulations — see the warning at the top
of `07-oaa-spec.md`. They are placeholders standing in for real values.

A dimension with no records is dropped from both the score and the radar rather
than plotted as a zero, and the page says so.

## Events — `/student/events`

Step 11, not built. Browse by type, event detail, register, "my registrations".
Participation feeds the Social dimension of OAA.

- TODO: can a student cancel a registration? Until when?

## Data source

There is **no database**. The backend persists to a single JSON document
(`backend/data/oaa-data.json`, gitignored, seeded on first run) through
`backend/src/data/store.ts`. Routes call services; services call the store. That
layering is what makes the store swappable — replacing it with Prisma later
touches only `store.ts` and the service queries.

Seeded students, all password `student123`:

| Roll no | Name          | Notes                                          |
| ------- | ------------- | ---------------------------------------------- |
| 22CS001 | Ananya Sharma | Strong record, ~87% attendance                 |
| 22CS002 | Rohan Verma   | **Below the 75% threshold** — shows the banner |
| 22CS003 | Meera Iyer    | Middling record, just above the threshold      |

The seed is generated from a fixed PRNG seed, so these figures are identical on
every machine.

## Authorisation

Every route is `requireAuth` → `requireSelfOrStaff`. A student may address only
their own record, as `me` or by their own id; a teacher or admin must name an
explicit student id. Verified: student A requesting student B returns **403**.

## Resolved — was an open question

- **Can a student log in before an admin creates their account?** No. There is no
  public sign-up; accounts exist only in the seed or via the admin module (Step 9).
- TODO: password change / forgot-password flow — needs email delivery, so it waits
  for a decision on whether this deployment has an SMTP route at all.
