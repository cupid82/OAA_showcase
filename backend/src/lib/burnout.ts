/**
 * The burnout check — a private early-warning signal, not a diagnosis.
 *
 * It reads the student's own weekly check-ins (energy, stress, sleep, workload,
 * enjoyment — loosely the exhaustion and detachment sides of burnout) together
 * with how many deadlines are bearing down on them, and says whether the load
 * looks steady, stretched or heavy enough to act on — with the reasons.
 *
 * **Not enough data is never "steady".** Fewer than two recent check-ins returns
 * a null level, and the UI says so. Calling an unmeasured student fine would be
 * the most comfortable wrong answer this file could give.
 *
 * Pure: check-ins in, a reading out. Nobody but the student ever sees it.
 */
import { addDays } from './dates.js';

export interface CheckinInput {
  /** Monday of the ISO week. */
  week: string;
  energy: number;
  stress: number;
  sleepHours: number;
  workload: number;
  enjoyment: number;
}

export type BurnoutLevel = 'steady' | 'stretched' | 'at-risk';

export type FactorKey =
  'stress' | 'sleep' | 'energy-drop' | 'workload' | 'detachment' | 'deadlines';

export interface BurnoutFactor {
  key: FactorKey;
  detail: string;
}

export interface BurnoutReading {
  level: BurnoutLevel | null;
  /** 0–100 strain. Null with the level. */
  score: number | null;
  /** Check-ins the reading rests on. */
  basedOn: number;
  factors: BurnoutFactor[];
}

/** Only the last four weeks count — an old bad month should not colour this one. */
export const WINDOW_DAYS = 28;
export const MIN_CHECKINS = 2;

/** Strain thresholds, on the 0–100 scale. */
export const LEVEL_THRESHOLDS = { stretched: 35, atRisk: 60 } as const;

/** Seven hours and up is no sleep debt; four or fewer is the maximum. */
const RESTED_HOURS = 7;
const SLEEP_DEBT_SPAN = 3;

/** Weights of the five answers in one check-in's strain. They sum to 1. */
export const STRAIN_WEIGHTS = {
  exhaustion: 0.25,
  stress: 0.25,
  workload: 0.2,
  detachment: 0.15,
  sleep: 0.15,
} as const;

/** Most recent first. Four check-ins at most fall inside the window. */
const RECENCY_WEIGHTS = [4, 3, 2, 1];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** One check-in's strain, 0 (fine) to 1 (every answer at its worst). */
export function strainOf(checkin: CheckinInput): number {
  const exhaustion = (5 - checkin.energy) / 4;
  const stress = (checkin.stress - 1) / 4;
  const workload = (checkin.workload - 1) / 4;
  const detachment = (5 - checkin.enjoyment) / 4;
  const sleep = clamp01((RESTED_HOURS - checkin.sleepHours) / SLEEP_DEBT_SPAN);

  return clamp01(
    STRAIN_WEIGHTS.exhaustion * exhaustion +
      STRAIN_WEIGHTS.stress * stress +
      STRAIN_WEIGHTS.workload * workload +
      STRAIN_WEIGHTS.detachment * detachment +
      STRAIN_WEIGHTS.sleep * sleep,
  );
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function strictlyRising(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || value > (values[index - 1] ?? value));
}

function strictlyFalling(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || value < (values[index - 1] ?? value));
}

/**
 * @param checkins   every check-in the student has; the window is applied here.
 * @param commitments deadlines, events and milestones due in the next 14 days.
 */
export function assessBurnout(
  checkins: readonly CheckinInput[],
  commitments: number,
  today: string,
): BurnoutReading {
  const since = addDays(today, -WINDOW_DAYS);
  const recent = checkins
    .filter((checkin) => checkin.week > since && checkin.week <= today)
    .sort((a, b) => b.week.localeCompare(a.week)) // newest first
    .slice(0, RECENCY_WEIGHTS.length);

  if (recent.length < MIN_CHECKINS) {
    return { level: null, score: null, basedOn: recent.length, factors: [] };
  }

  const strains = recent.map(strainOf);
  const weights = RECENCY_WEIGHTS.slice(0, recent.length);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  let strain =
    strains.reduce((sum, value, index) => sum + value * (weights[index] ?? 0), 0) / weightSum;

  // Oldest → newest over the last three.
  const lastThree = recent.slice(0, 3).reverse();
  if (lastThree.length === 3 && strictlyRising(lastThree.map(strainOf))) strain += 0.05;

  if (commitments >= 7) strain += 0.1;
  else if (commitments >= 4) strain += 0.05;

  const score = Math.round(clamp01(strain) * 100);
  const level: BurnoutLevel =
    score >= LEVEL_THRESHOLDS.atRisk
      ? 'at-risk'
      : score >= LEVEL_THRESHOLDS.stretched
        ? 'stretched'
        : 'steady';

  return { level, score, basedOn: recent.length, factors: factorsFor(recent, commitments) };
}

/** The reasons, in plain words. `recent` is newest first. */
function factorsFor(recent: readonly CheckinInput[], commitments: number): BurnoutFactor[] {
  const factors: BurnoutFactor[] = [];
  const latest = recent[0];
  if (!latest) return factors;

  const lastThree = recent.slice(0, 3);
  const highStress = lastThree.filter((checkin) => checkin.stress >= 4).length;
  if (highStress >= 2) {
    factors.push({
      key: 'stress',
      detail: `Stress was 4 or 5 in ${highStress} of your last ${lastThree.length} check-ins.`,
    });
  }

  const averageSleep = recent.reduce((sum, checkin) => sum + checkin.sleepHours, 0) / recent.length;
  if (averageSleep < 6) {
    factors.push({
      key: 'sleep',
      detail: `You're averaging ${round1(averageSleep)} hours of sleep a night.`,
    });
  }

  const energies = [...lastThree].reverse().map((checkin) => checkin.energy);
  if (energies.length === 3 && strictlyFalling(energies)) {
    factors.push({
      key: 'energy-drop',
      detail: 'Your energy has dropped three check-ins running.',
    });
  }

  if (latest.workload >= 4) {
    factors.push({
      key: 'workload',
      detail: `You rated your workload ${latest.workload} out of 5 this time.`,
    });
  }

  if (latest.enjoyment <= 2) {
    factors.push({
      key: 'detachment',
      detail: 'You are enjoying your work less — that often comes before exhaustion.',
    });
  }

  if (commitments >= 4) {
    factors.push({
      key: 'deadlines',
      detail: `${commitments} deadlines, events and milestones fall in the next two weeks.`,
    });
  }

  return factors;
}

/** What to do about each factor. Shown beside it, in the student's own view. */
export const FACTOR_ADVICE: Record<FactorKey, string> = {
  stress:
    'Pick the one thing causing most of it and ask whether it has to happen this week. Most deadlines are more movable than they feel.',
  sleep:
    'Sleep is the first thing to protect, not the first thing to cut. A fixed wind-down time does more than a later alarm.',
  'energy-drop':
    'Three falling weeks is a trend, not a bad day. Block one evening this week with nothing scheduled.',
  workload:
    'Snooze non-urgent nudges below, and pause a project instead of letting it nag you. Paused is a decision, not a failure.',
  detachment:
    'When work stops being enjoyable, spend an hour on something you picked for fun — a small side idea, not a résumé line.',
  deadlines:
    'Look at the list below and drop or defer one commitment. Saying no to one event protects the other three.',
};
