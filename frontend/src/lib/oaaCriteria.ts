/**
 * The seven adaptability sub-criteria, as the UI names them.
 *
 * One list, used by the teacher's rating form and the student's breakdown, so the
 * same criterion cannot be called "Handling pressure" on one screen and
 * "Resilience" on the other.
 *
 * The `key` values must match `ADAPTABILITY_CRITERIA` in
 * `backend/src/data/types.ts` — the server validates every key, so a drift here
 * surfaces as a 400 rather than a silently dropped criterion.
 */
export interface AdaptabilityCriterion {
  key: string;
  label: string;
  /** Shown under the label on the teacher's rating form. */
  hint: string;
}

export const ADAPTABILITY_CRITERIA: AdaptabilityCriterion[] = [
  {
    key: 'communication',
    label: 'Communication',
    hint: 'Explains work clearly, listens in review',
  },
  { key: 'teamwork', label: 'Teamwork', hint: 'Contributes to group work, shares credit' },
  {
    key: 'problemSolving',
    label: 'Problem solving',
    hint: 'Breaks down an unfamiliar problem',
  },
  { key: 'initiative', label: 'Initiative', hint: 'Starts without being told to' },
  {
    key: 'resilience',
    label: 'Handling pressure',
    hint: 'Recovers from a setback or a changed brief',
  },
  {
    key: 'timeManagement',
    label: 'Time management',
    hint: 'Delivers when they said they would',
  },
  { key: 'leadership', label: 'Leadership', hint: 'Takes responsibility for others’ outcomes' },
];

const BY_KEY = new Map(ADAPTABILITY_CRITERIA.map((criterion) => [criterion.key, criterion]));

/** Falls back to a de-camel-cased key, so an unknown criterion still reads. */
export function criterionLabel(key: string): string {
  const known = BY_KEY.get(key);
  if (known) return known.label;

  const spaced = key.replace(/([A-Z])/g, ' $1').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const ADAPTABILITY_RATINGS = [1, 2, 3, 4, 5] as const;
