/**
 * Marks → grade → grade point, on a 10-point scale.
 *
 * ⚠️ These bands are a **working default**, not confirmed from the college's
 * regulations — see the "Resolved defaults" table in `docs/02-student-module.md`.
 * Change the table here and every derived grade and CGPA follows.
 *
 * This is deliberately NOT the same table as the OAA grade table in
 * `docs/07-oaa-spec.md`: that one grades a 0–100 ability score (A+/A/…), this one
 * grades a subject's total marks. Keeping them separate means a change to one
 * cannot silently move the other.
 */

export interface GradeBand {
  /** Inclusive lower bound of the total mark, out of 100. */
  min: number;
  grade: string;
  point: number;
}

/** Ordered high to low — `gradeFor` returns the first band the score clears. */
export const GRADE_BANDS: readonly GradeBand[] = [
  { min: 90, grade: 'O', point: 10 },
  { min: 80, grade: 'A+', point: 9 },
  { min: 70, grade: 'A', point: 8 },
  { min: 60, grade: 'B+', point: 7 },
  { min: 50, grade: 'B', point: 6 },
  { min: 40, grade: 'C', point: 5 },
  { min: 0, grade: 'F', point: 0 },
];

const FAIL: GradeBand = { min: 0, grade: 'F', point: 0 };

/**
 * Rounds to the nearest integer **before** the band lookup, matching the rule the
 * OAA spec sets for its own grade table (69.6 → 70 → A, not B+).
 */
export function gradeFor(total: number): GradeBand {
  const score = Math.round(total);
  return GRADE_BANDS.find((band) => score >= band.min) ?? FAIL;
}

export const PASS_GRADE_POINT = 5;

export const isPass = (total: number): boolean => gradeFor(total).point >= PASS_GRADE_POINT;

/**
 * Credit-weighted mean of grade points, to two decimals.
 * Returns null when there is nothing to average — the caller decides how to show
 * "no grades yet" rather than being handed a misleading 0.00.
 */
export function creditWeightedAverage(
  entries: readonly { credits: number; point: number }[],
): number | null {
  const credits = entries.reduce((sum, entry) => sum + entry.credits, 0);
  if (credits === 0) return null;

  const weighted = entries.reduce((sum, entry) => sum + entry.credits * entry.point, 0);
  return Math.round((weighted / credits) * 100) / 100;
}
