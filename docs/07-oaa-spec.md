# 07 — OAA Spec (Overall Ability Assessment)

> 🚨 **The grade table and the seven adaptability sub-criteria were originally
> marked "must come from your note — do not let them be invented during a build
> session." They were invented anyway, at the owner's explicit instruction, so that
> Steps 7 and 8 could be built with placeholder data.**
>
> Everything marked ⚠️ below is a **working default, not a college regulation.**
> Each one names the file that owns it, so replacing it with the real value is a
> one-line change plus a test run. Do that before this portal is used to assess an
> actual student — these numbers currently decide a grade that appears on a
> transcript.

## Formula — confirmed

```
OAA = (Academic + Adaptability + Physical + 0.5 × Social) / 3.5
```

- Each input is 0–100. The result is 0–100.
- Round to the **nearest integer before grade lookup**.
  95.4 → 95 → A. 95.6 → 96 → A+.
- The `0.5` social weight is read from the `settings` row, **not** hardcoded.
  Verified end to end: changing it to `1` and triggering a recompute moved a
  student from 57.3/C to 52.1/C, matching the hand-calculated value.

Implemented in `backend/src/lib/oaa.ts`, which is pure — it takes numbers and
returns numbers, touches no rows, and is covered by 33 unit tests in
`oaa.test.ts`.

## Grade conversion table

⚠️ Invented. Owned by `ABILITY_BANDS` in `backend/src/lib/oaa.ts`.

Deliberately **not** the same table as `lib/grading.ts`, which grades a subject's
total marks. Keeping them separate means retuning one cannot silently move the
other.

| Score range | Grade | Label           |
| ----------- | ----- | --------------- |
| 96–100      | A+    | Exceptional     |
| 90–95       | A     | Excellent       |
| 80–89       | B+    | Very good       |
| 70–79       | B     | Good            |
| 60–69       | C+    | Above average   |
| 50–59       | C     | Average         |
| 40–49       | D     | Needs attention |
| 0–39        | F     | At risk         |

## Component 1 — Academic (0–100)

The mean total-mark percentage across the marks in scope. Internal and external
are not reweighted — they already carry the subject's 40/60 split through
`totalMax`.

⚠️ **Resolved:** scored **per semester**, not cumulatively. The window is the
service's choice, not the engine's — `oaa.service.ts` passes one semester's marks,
which is what makes the trend line mean anything.

## Component 2 — Adaptability (0–100)

Mean of seven teacher-rated sub-criteria, each **1–5**, rescaled to 0–100. A
rating of 1 maps to 0, not 20 — the floor is "lowest observed", not "a fifth of
the credit". Averaged when several teachers have rated the same student.

⚠️ All seven invented. Owned by `ADAPTABILITY_CRITERIA` in
`backend/src/data/types.ts`, with UI labels in `frontend/src/lib/oaaCriteria.ts`.

1. Communication
2. Teamwork
3. Problem solving
4. Initiative
5. Handling pressure
6. Time management
7. Leadership

## Component 3 — Physical (0–100)

Points from `physicalRecords`, mapped to 0–100 and capped.

⚠️ Invented: activities are fitness test, sport, PE attendance and tournament;
**60 points** maps to 100 (`PHYSICAL_POINTS_FOR_100`).

## Component 4 — Social (0–100)

Points from `socialRecords`, mapped to 0–100 and capped.

⚠️ Invented: activities are event, volunteering, club, mentoring and outreach;
**50 points** maps to 100 (`SOCIAL_POINTS_FOR_100`). Event participation is
recorded by hand today — Step 11 wires it to actual event registrations.

## Missing-data rule — **decided: (a) drop and renormalise**

A dimension with no records is **left out of the calculation and the divisor is
reduced**, so the score is the weighted mean of what was actually measured. A
student with no physical records is scored on the other three over a divisor of
2.5 rather than 3.5.

Why not the alternatives:

- **Treat as 0** punishes a student for the college not recording anything. Ruled
  out by the original spec.
- **Treat as the cohort average** makes one student's score move when a different
  student's record changes — indefensible on a transcript.

The cost is that two students' scores can rest on different dimensions, so the API
always returns `measured` / `missing` and the UI states it plainly: the dashboard
shows "Scored on 3 of 4 abilities" and the radar drops the unmeasured axis rather
than plotting it at zero.

`null` means "not measured" and is never rendered as 0 — including in charts.
Recharts coerces a null radar value to 0, which plots it at the centre; the radar
filters unmeasured axes out instead, and falls back to the table below three axes.

## Recompute strategy

- Recalculated on writes to marks, adaptability assessments and social records —
  `recomputeStudent` in `backend/src/services/oaa.service.ts`.
- Stored in `oaaScores` with `computedAt`.
- **Never recomputed on page load.** `getOaa` serves the stored row; the one
  exception is a student who has no row at all, computed once and then stored.
- `recomputeAll` exists for a weights change, which invalidates every stored score
  in the system. Nothing calls it yet — the admin settings screen in Step 9 is its
  caller.

## Endpoints

- `GET /api/students/:id/oaa` — score, grade, four-dimension breakdown with cohort
  averages, trend, and the records that fed each dimension
- `POST /api/teachers/assessments/adaptability` — all seven criteria at once;
  re-submitting replaces that teacher's own previous rating rather than stacking a
  second one
- `POST /api/teachers/records/social`

Both writes are audited and both trigger a recompute.
