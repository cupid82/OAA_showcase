# 07 — OAA Spec (Overall Ability Assessment)

> 🚨 **This is the one file Step 7 cannot be built without.** The grade table and
> the seven adaptability sub-criteria must come from your note — do not let them be
> invented during a build session.

## Formula — confirmed

```
OAA = (Academic + Adaptability + Physical + 0.5 × Social) / 3.5
```

- Each input is 0–100. The result is 0–100.
- Round to the **nearest integer before grade lookup**.
  95.4 → 95 → A. 95.6 → 96 → A+.
- The `0.5` social weight is read from the `settings` table, **not** hardcoded —
  the admin module promises configurable weights.

## Grade conversion table

TODO: paste the real table. Placeholder shape:

| Score range | Grade |
| ----------- | ----- |
| 96–100      | A+    |
| 90–95       | A     |
| TODO        | TODO  |
| 0–TODO      | F     |

## Component 1 — Academic (0–100)

Derived from marks.
TODO: is it the mean percentage across subjects for the current semester, or
cumulative across semesters? Are internal and external weighted equally?

## Component 2 — Adaptability (0–100)

Average of 7 teacher-rated sub-criteria.
TODO: name all seven and give each one's rating scale (1–5? 1–10?).

1. TODO
2. TODO
3. TODO
4. TODO
5. TODO
6. TODO
7. TODO

## Component 3 — Physical (0–100)

Points from `physical_records`, mapped to 0–100.
TODO: what counts as a physical record (sports participation, fitness test, PE
attendance?) and how many points does each award?
TODO: what is the point total that maps to 100?

## Component 4 — Social (0–100)

Points from `social_records` plus event participation, mapped to 0–100.
TODO: point values per activity type, and the cap that maps to 100.

## Missing-data rule — must be decided

A student with no physical records must not crash the calculation and must not be
unfairly zeroed.
TODO: pick one and document it — (a) drop the dimension and renormalize the divisor,
(b) treat as cohort average, (c) treat as 0. Step 7 has a unit test for this.

## Recompute strategy

- Recalculate on writes to marks / attendance / assessments.
- Store the result in `oaa_scores` with `computed_at`.
- Never recompute on page load.

## Endpoints

- `GET /api/students/me/oaa` — score, grade, 4-dimension breakdown, trend
- `POST /api/teachers/assessments/adaptability`
- `POST /api/teachers/records/social`
