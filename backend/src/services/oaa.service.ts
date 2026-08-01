/**
 * OAA read models and the recompute path.
 *
 * The engine itself is pure and lives in `lib/oaa.ts`. This file is the part that
 * knows about rows: it gathers a student's inputs, calls the engine, and stores the
 * answer in `oaaScores`.
 *
 * **Recompute on write, never on read.** `getOaa` serves the stored row. Anything
 * that changes an input — marks, an adaptability assessment, a social record —
 * calls `recomputeStudent`. That is the spec's strategy, and it is also what makes
 * a leaderboard over ten thousand students possible later without re-deriving
 * everyone on every request.
 */
import { getDb, persist } from '../data/store.js';
import type { OaaScoreRow, SettingsRow } from '../data/types.js';
import {
  DIMENSION_ADVICE,
  DIMENSION_LABEL,
  OAA_DIMENSIONS,
  PHYSICAL_POINTS_FOR_100,
  SOCIAL_POINTS_FOR_100,
  academicScore,
  adaptabilityScore,
  calculateOaa,
  pointsToScore,
  strongestDimension,
  weakestDimension,
} from '../lib/oaa.js';
import type { OaaDimension, OaaInputs, OaaWeights } from '../lib/oaa.js';
import { HttpError } from '../lib/httpError.js';

function settings(): SettingsRow {
  return getDb().settings;
}

export function oaaWeights(): OaaWeights {
  return settings().oaaWeights;
}

/** Gathers one student's raw inputs for one semester. */
function inputsFor(studentId: string, semester: number): OaaInputs {
  const db = getDb();

  const semesterMarks = db.marks
    .filter((row) => row.studentId === studentId && row.semester === semester)
    .map((row) => {
      const subject = db.subjects.find((entry) => entry.id === row.subjectId);
      return {
        total: row.internal + row.external,
        totalMax: (subject?.internalMax ?? 0) + (subject?.externalMax ?? 0),
      };
    });

  return {
    academic: academicScore(semesterMarks),
    adaptability: adaptabilityScore(
      db.adaptabilityAssessments
        .filter((row) => row.studentId === studentId && row.semester === semester)
        .map((row) => row.scores),
    ),
    physical: pointsToScore(
      db.physicalRecords.filter((row) => row.studentId === studentId && row.semester === semester),
      PHYSICAL_POINTS_FOR_100,
    ),
    social: pointsToScore(
      db.socialRecords.filter((row) => row.studentId === studentId && row.semester === semester),
      SOCIAL_POINTS_FOR_100,
    ),
  };
}

/**
 * Recomputes and stores one semester's score. Call after any write to an input.
 * Does not persist — the caller flushes once, so a mutation and the score it
 * implies land on disk together.
 */
export function recomputeSemester(studentId: string, semester: number): OaaScoreRow {
  const db = getDb();
  const inputs = inputsFor(studentId, semester);
  const result = calculateOaa(inputs, oaaWeights());

  const row: OaaScoreRow = {
    id: `oaa-${studentId}-s${semester}`,
    studentId,
    semester,
    ...inputs,
    score: result.score,
    grade: result.grade,
    computedAt: new Date().toISOString(),
  };

  const index = db.oaaScores.findIndex((entry) => entry.id === row.id);
  if (index === -1) db.oaaScores.push(row);
  else db.oaaScores[index] = row;

  return row;
}

/** Recomputes every semester a student has an input for. */
export async function recomputeStudent(studentId: string): Promise<void> {
  const db = getDb();

  const semesters = new Set<number>([
    ...db.marks.filter((row) => row.studentId === studentId).map((row) => row.semester),
    ...db.adaptabilityAssessments
      .filter((row) => row.studentId === studentId)
      .map((row) => row.semester),
    ...db.physicalRecords.filter((row) => row.studentId === studentId).map((row) => row.semester),
    ...db.socialRecords.filter((row) => row.studentId === studentId).map((row) => row.semester),
  ]);

  for (const semester of semesters) recomputeSemester(studentId, semester);
  await persist();
}

/**
 * Recomputes everyone. Used after a settings change — the weights are global, so
 * one edit invalidates every stored score in the system.
 */
export async function recomputeAll(): Promise<number> {
  const db = getDb();
  let count = 0;

  for (const student of db.students) {
    const semesters = new Set(
      db.oaaScores.filter((row) => row.studentId === student.id).map((row) => row.semester),
    );
    for (const semester of semesters) {
      recomputeSemester(student.id, semester);
      count += 1;
    }
  }

  await persist();
  return count;
}

// --- Read model --------------------------------------------------------------

export interface DimensionBreakdown {
  key: OaaDimension;
  label: string;
  /** Null means "not measured" — the UI must not draw it as a zero. */
  value: number | null;
  weight: number;
  /** Class mean for this dimension and semester, for the radar's context series. */
  cohort: number | null;
}

export interface ContributingRecord {
  label: string;
  activity: string;
  points: number;
}

export interface TrendPoint {
  semester: number;
  score: number | null;
  grade: string | null;
}

export interface OaaSummary {
  semester: number;
  score: number | null;
  grade: string | null;
  label: string | null;
  computedAt: string;
  /** Sum of the weights actually used — 3.5 when all four are present. */
  divisor: number;
  dimensions: DimensionBreakdown[];
  missing: OaaDimension[];
  strongest: { key: OaaDimension; label: string; value: number } | null;
  weakest: { key: OaaDimension; label: string; value: number; advice: string } | null;
  trend: TrendPoint[];
  physicalRecords: ContributingRecord[];
  socialRecords: ContributingRecord[];
  adaptabilityRatings: { criterion: string; score: number }[];
  ratingScale: { min: number; max: number };
  weights: OaaWeights;
  /** Number of students the cohort average is taken over. */
  cohortSize: number;
}

/** Mean of a dimension across every student in the same semester. */
function cohortAverages(semester: number): {
  averages: Record<OaaDimension, number | null>;
  size: number;
} {
  const rows = getDb().oaaScores.filter((row) => row.semester === semester);

  const averages = Object.fromEntries(
    OAA_DIMENSIONS.map((dimension) => {
      const values = rows
        .map((row) => row[dimension])
        .filter((value): value is number => value !== null);

      return [
        dimension,
        values.length === 0
          ? null
          : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
      ];
    }),
  ) as Record<OaaDimension, number | null>;

  return { averages, size: rows.length };
}

export function getOaa(studentId: string): OaaSummary {
  const db = getDb();

  const student = db.students.find((row) => row.id === studentId);
  if (!student) throw HttpError.notFound('Student not found.');

  const semester = student.semester;

  // Served from storage, not recalculated. A student whose row is missing has had
  // no input written since the feature landed — compute it once, then store it.
  let row = db.oaaScores.find(
    (entry) => entry.studentId === studentId && entry.semester === semester,
  );
  if (!row) row = recomputeSemester(studentId, semester);

  const inputs: OaaInputs = {
    academic: row.academic,
    adaptability: row.adaptability,
    physical: row.physical,
    social: row.social,
  };

  const weights = oaaWeights();
  const result = calculateOaa(inputs, weights);
  const { averages, size } = cohortAverages(semester);

  const strongestKey = strongestDimension(inputs);
  const weakestKey = weakestDimension(inputs);

  const assessment = db.adaptabilityAssessments
    .filter((entry) => entry.studentId === studentId && entry.semester === semester)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];

  return {
    semester,
    score: row.score,
    grade: row.grade,
    label: result.label,
    computedAt: row.computedAt,
    divisor: result.divisor,
    dimensions: OAA_DIMENSIONS.map((key) => ({
      key,
      label: DIMENSION_LABEL[key],
      value: inputs[key],
      weight: weights[key],
      cohort: averages[key],
    })),
    missing: result.missing,
    strongest:
      strongestKey === null
        ? null
        : {
            key: strongestKey,
            label: DIMENSION_LABEL[strongestKey],
            value: inputs[strongestKey] ?? 0,
          },
    weakest:
      weakestKey === null
        ? null
        : {
            key: weakestKey,
            label: DIMENSION_LABEL[weakestKey],
            value: inputs[weakestKey] ?? 0,
            advice: DIMENSION_ADVICE[weakestKey],
          },
    trend: db.oaaScores
      .filter((entry) => entry.studentId === studentId)
      .sort((a, b) => a.semester - b.semester)
      .map((entry) => ({ semester: entry.semester, score: entry.score, grade: entry.grade })),
    physicalRecords: db.physicalRecords
      .filter((entry) => entry.studentId === studentId && entry.semester === semester)
      .map((entry) => ({ label: entry.label, activity: entry.activity, points: entry.points })),
    socialRecords: db.socialRecords
      .filter((entry) => entry.studentId === studentId && entry.semester === semester)
      .map((entry) => ({ label: entry.label, activity: entry.activity, points: entry.points })),
    adaptabilityRatings: assessment
      ? Object.entries(assessment.scores).map(([criterion, score]) => ({ criterion, score }))
      : [],
    ratingScale: { min: 1, max: 5 },
    weights,
    cohortSize: size,
  };
}
