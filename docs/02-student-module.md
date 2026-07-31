# 02 — Student Module

> ⚠️ Outline only. Paste your Obsidian note 02 over this file.
> Used by Step 5 (read-only slice) and Step 11 (events).

## v1 dashboard scope

Cards: Profile · Marks · Attendance · OAA · Leaderboard · Timetable ·
Announcements · Events · Assignments.
Out of scope for v1: Fee, Library, Placement, Clubs.

## Profile — `/student/profile`

- TODO: exact field list (roll no, name, DOB, department, semester, section,
  admission year, blood group, guardian, phone, email, address, photo)
- TODO: which fields is the student allowed to edit themselves?

## Marks — `/student/marks`

- Subject-wise table, grouped by semester, columns: internal / external / total / grade.
- TODO: internal and external max marks per subject
- TODO: grade bands (is this the same table as the OAA grade table, or different?)
- TODO: is CGPA shown here, and how is it computed?

## Attendance — `/student/attendance`

- Overall %, per-subject breakdown, monthly trend bar chart (Recharts).
- Red warning banner below the threshold.
- TODO: confirm threshold is 75%
- TODO: does the student see individual dated records, or only aggregates?

## OAA — `/student/oaa`

See `07-oaa-spec.md`.

## Events — `/student/events`

- Browse by type, event detail, register, "my registrations".
- Participation feeds the Social dimension of OAA.
- TODO: can a student cancel a registration? Until when?

## TODO — open questions

- TODO: can a student log in before an admin creates their account? (roadmap says no)
- TODO: password change / forgot password flow
