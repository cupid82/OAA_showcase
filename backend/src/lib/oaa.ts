/**
 * The OAA calculation engine — Overall Ability Assessment.
 *
 *     OAA = (Academic + Adaptability + Physical + 0.5 × Social) / 3.5
 *
 * Every function here is **pure**: it takes numbers and returns numbers, and never
 * touches the store. That is what makes the engine testable without fixtures, and
 * it is deliberate — a wrong chart is obvious, a wrong score is invisible, so this
 * file is the one place in the project that gets tests before it gets a UI.
 *
 * ⚠️ The grade table below and the seven adaptability criteria were **invented
 * during the build** — `docs/07-oaa-spec.md` left both as TODO. They are working
 * defaults, not the college's regulations. Every derived number follows from them,
 * so change them deliberately and re-run the tests.
 */
import { ADAPTABILITY_CRITERIA } from '../data/types.js';
import type { AdaptabilityCriterion } from '../data/types.js';

/** The four dimensions, in the order they are shown on the radar chart. */
export const OAA_DIMENSIONS = ['academic', 'adaptability', 'physical', 'social'] as const;

export type OaaDimension = (typeof OAA_DIMENSIONS)[number];

export type OaaWeights = Record<OaaDimension, number>;

/**
 * The spec's weights. Read from the settings row at runtime — this constant is the
 * seed's starting value and the tests' fixture, never a fallback the service uses.
 */
export const DEFAULT_WEIGHTS: OaaWeights = {
  academic: 1,
  adaptability: 1,
  physical: 1,
  social: 0.5,
};

// --- Grade table -------------------------------------------------------------

export interface AbilityBand {
  /** Inclusive lower bound of the rounded 0–100 ability score. */
  min: number;
  grade: string;
  label: string;
}

/**
 * Grades a 0–100 **ability score**. Deliberately NOT the same table as
 * `grading.ts`, which grades a subject's total marks — keeping them separate means
 * retuning one cannot silently move the other.
 */
export const ABILITY_BANDS: readonly AbilityBand[] = [
  { min: 96, grade: 'A+', label: 'Exceptional' },
  { min: 90, grade: 'A', label: 'Excellent' },
  { min: 80, grade: 'B+', label: 'Very good' },
  { min: 70, grade: 'B', label: 'Good' },
  { min: 60, grade: 'C+', label: 'Above average' },
  { min: 50, grade: 'C', label: 'Average' },
  { min: 40, grade: 'D', label: 'Needs attention' },
  { min: 0, grade: 'F', label: 'At risk' },
];

const AT_RISK: AbilityBand = { min: 0, grade: 'F', label: 'At risk' };

/**
 * Rounds to the nearest integer **before** the band lookup, per the spec:
 * 95.4 → 95 → A, and 95.6 → 96 → A+.
 */
export function abilityGrade(score: number): AbilityBand {
  const rounded = Math.round(score);
  return ABILITY_BANDS.find((band) => rounded >= band.min) ?? AT_RISK;
}

// --- Dimension inputs --------------------------------------------------------

const clamp100 = (value: number) => Math.min(100, Math.max(0, value));

/** One decimal place — enough precision to be honest, few enough to be readable. */
const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Academic (0–100): the mean total-mark percentage across the marks it is given.
 *
 * The *window* is the caller's decision, not this function's — the service passes
 * one semester's marks when computing that semester's row, which is what makes the
 * trend line mean anything. Internal and external are not reweighted here; they
 * already carry the subject's own 40/60 split through `totalMax`.
 */
export function academicScore(
  marks: readonly { total: number; totalMax: number }[],
): number | null {
  const graded = marks.filter((mark) => mark.totalMax > 0);
  if (graded.length === 0) return null;

  const mean =
    graded.reduce((sum, mark) => sum + (mark.total / mark.totalMax) * 100, 0) / graded.length;

  return round1(clamp100(mean));
}

export const ADAPTABILITY_MIN_RATING = 1;
export const ADAPTABILITY_MAX_RATING = 5;

/**
 * Adaptability (0–100): the mean of the seven sub-criteria, rescaled from 1–5.
 *
 * A rating of 1 maps to 0, not to 20 — the scale's floor is "lowest observed", not
 * "a fifth of the credit". Averaged across assessments when several teachers have
 * rated the same student.
 */
export function adaptabilityScore(
  assessments: readonly Record<AdaptabilityCriterion, number>[],
): number | null {
  if (assessments.length === 0) return null;

  const perAssessment = assessments.map((scores) => {
    const total = ADAPTABILITY_CRITERIA.reduce(
      (sum, criterion) => sum + (scores[criterion] ?? ADAPTABILITY_MIN_RATING),
      0,
    );
    return total / ADAPTABILITY_CRITERIA.length;
  });

  const mean = perAssessment.reduce((sum, value) => sum + value, 0) / perAssessment.length;
  const span = ADAPTABILITY_MAX_RATING - ADAPTABILITY_MIN_RATING;

  return round1(clamp100(((mean - ADAPTABILITY_MIN_RATING) / span) * 100));
}

/**
 * Points that map to a full 100 in the Physical and Social dimensions.
 *
 * ⚠️ Invented — the spec left "the point total that maps to 100" as TODO. A student
 * who does everything expected in a semester lands near the cap; the cap is not
 * meant to be unreachable.
 */
export const PHYSICAL_POINTS_FOR_100 = 60;
export const SOCIAL_POINTS_FOR_100 = 50;

/**
 * Maps an award of points onto 0–100, capped.
 *
 * Returns `null` for "no records at all", which is what feeds the missing-data
 * rule below. A student with records totalling zero points is a real 0 — the
 * distinction between "not measured" and "measured as nothing" matters here.
 */
export function pointsToScore(
  records: readonly { points: number }[],
  pointsFor100: number,
): number | null {
  if (records.length === 0) return null;

  const total = records.reduce((sum, record) => sum + record.points, 0);
  return round1(clamp100((total / pointsFor100) * 100));
}

// --- The formula -------------------------------------------------------------

export type OaaInputs = Record<OaaDimension, number | null>;

export interface OaaResult {
  /** Null only when no dimension has any data — never a misleading 0. */
  score: number | null;
  grade: string | null;
  label: string | null;
  /** The dimensions that carried the result, and those that were skipped. */
  measured: OaaDimension[];
  missing: OaaDimension[];
  /** Sum of the weights actually used. 3.5 when everything is present. */
  divisor: number;
}

/**
 * The missing-data rule — **(a) drop the dimension and renormalise the divisor.**
 *
 * The spec required a decision here and forbade zeroing. Of the three candidates:
 *
 * - Treating a missing dimension as **0** punishes a student for the college not
 *   having recorded anything. Explicitly ruled out by the spec.
 * - Treating it as the **cohort average** makes one student's score move when a
 *   different student's record changes, which is indefensible on a transcript.
 * - **Dropping it and renormalising** says exactly what is true: this is the mean
 *   of what we actually measured. A student with no physical records is scored on
 *   the other three, and the API reports which ones those were.
 *
 * The cost is that two students' scores can rest on different dimensions, so the
 * response always carries `measured` / `missing` and the UI shows them.
 */
export function calculateOaa(inputs: OaaInputs, weights: OaaWeights): OaaResult {
  const measured = OAA_DIMENSIONS.filter((dimension) => inputs[dimension] !== null);
  const missing = OAA_DIMENSIONS.filter((dimension) => inputs[dimension] === null);

  const divisor = measured.reduce((sum, dimension) => sum + weights[dimension], 0);

  // Nothing measured, or every measured dimension carries zero weight.
  if (divisor === 0) {
    return { score: null, grade: null, label: null, measured, missing, divisor: 0 };
  }

  const weighted = measured.reduce(
    (sum, dimension) => sum + (inputs[dimension] ?? 0) * weights[dimension],
    0,
  );

  const score = round1(clamp100(weighted / divisor));
  const band = abilityGrade(score);

  return { score, grade: band.grade, label: band.label, measured, missing, divisor };
}

/** The dimension a student should work on first — lowest measured value wins. */
export function weakestDimension(inputs: OaaInputs): OaaDimension | null {
  const measured = OAA_DIMENSIONS.filter((dimension) => inputs[dimension] !== null);
  if (measured.length === 0) return null;

  return measured.reduce((lowest, dimension) =>
    (inputs[dimension] ?? 0) < (inputs[lowest] ?? 0) ? dimension : lowest,
  );
}

export function strongestDimension(inputs: OaaInputs): OaaDimension | null {
  const measured = OAA_DIMENSIONS.filter((dimension) => inputs[dimension] !== null);
  if (measured.length === 0) return null;

  return measured.reduce((highest, dimension) =>
    (inputs[dimension] ?? 0) > (inputs[highest] ?? 0) ? dimension : highest,
  );
}

export const DIMENSION_LABEL: Record<OaaDimension, string> = {
  academic: 'Academic',
  adaptability: 'Adaptability',
  physical: 'Physical',
  social: 'Social',
};

/** Shown on the dashboard beside the weakest dimension. */
export const DIMENSION_ADVICE: Record<OaaDimension, string> = {
  academic:
    'Internal marks move fastest — they are coursework, not one exam. Ask each subject teacher which assessment still has weight left this semester.',
  adaptability:
    'This is rated by the teachers who supervise your project and lab work. Volunteering to present, or to own a piece of a group task, is what moves it.',
  physical:
    'Fitness tests, PE attendance and any inter-department sport all count. One tournament entry is worth several weeks of routine attendance.',
  social:
    'Event participation, volunteering, club roles and mentoring all record here. Register for an upcoming event — participation is logged automatically.',
};
