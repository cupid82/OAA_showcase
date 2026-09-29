/**
 * Momentum — the points behind the leaderboard.
 *
 * The leaderboard ranks what students *do*: ship projects, prove skills, show up
 * to events, practise. It never counts marks, attendance or job applications —
 * the first two belong to the ERP, and the last is private. That boundary is the
 * point of the feature, so it is enforced here, in the only place points exist.
 *
 * Pure: activity in, a ledger out. `momentum.service.ts` gathers the rows and
 * stores the result. Like the rest of the scoring in this project, the ledger is
 * recomputed on write and read from storage, never rebuilt on page load.
 */
import type { EventOutcome, EventType, MomentumPoints, MomentumSource } from '../data/types.js';
import { weekStart } from './dates.js';

/**
 * The seed's starting values and the tests' fixture. The service reads the live
 * values from `settings.momentumPoints` — this is never a fallback.
 */
export const DEFAULT_POINTS: MomentumPoints = {
  projectShipped: 40,
  milestoneDone: 5,
  milestoneCapPerProject: 8,
  skillProven: 15,
  certificate: 10,
  eventAttended: 10,
  hackathonAttended: 20,
  eventPlaced: 15,
  practicePerHalfHour: 1,
  practiceWeeklyCap: 10,
};

export const MOMENTUM_CATEGORIES = ['building', 'learning', 'events'] as const;

export type MomentumCategory = (typeof MOMENTUM_CATEGORIES)[number];

export const SOURCE_CATEGORY: Record<MomentumSource, MomentumCategory> = {
  'project-shipped': 'building',
  milestone: 'building',
  'skill-proven': 'learning',
  certificate: 'learning',
  practice: 'learning',
  'event-attended': 'events',
  'event-placed': 'events',
};

export interface MomentumInputs {
  /** Only projects that tell their story — see `isStoryComplete`. */
  shippedProjects: readonly { id: string; title: string; shippedAt: string }[];
  completedTasks: readonly { id: string; projectId: string; title: string; doneAt: string }[];
  provenSkills: readonly { skillId: string; name: string; provenAt: string }[];
  certificates: readonly { id: string; title: string; issuedOn: string }[];
  attendedEvents: readonly {
    id: string;
    title: string;
    type: EventType;
    date: string;
    outcome: EventOutcome | null;
  }[];
  practice: readonly { date: string; minutes: number }[];
}

export interface LedgerEntry {
  source: MomentumSource;
  refId: string;
  label: string;
  points: number;
  /** ISO date or timestamp the points were earned — windows filter on it. */
  at: string;
}

export function deriveLedger(inputs: MomentumInputs, points: MomentumPoints): LedgerEntry[] {
  const ledger: LedgerEntry[] = [];

  for (const project of inputs.shippedProjects) {
    ledger.push({
      source: 'project-shipped',
      refId: project.id,
      label: `Shipped ${project.title}`,
      points: points.projectShipped,
      at: project.shippedAt,
    });
  }

  // Milestones count earliest-first, up to the cap per project.
  const byProject = new Map<string, MomentumInputs['completedTasks'][number][]>();
  for (const task of inputs.completedTasks) {
    const list = byProject.get(task.projectId) ?? [];
    list.push(task);
    byProject.set(task.projectId, list);
  }
  for (const tasks of byProject.values()) {
    const counted = [...tasks]
      .sort((a, b) => a.doneAt.localeCompare(b.doneAt) || a.id.localeCompare(b.id))
      .slice(0, Math.max(0, points.milestoneCapPerProject));

    for (const task of counted) {
      ledger.push({
        source: 'milestone',
        refId: task.id,
        label: `Milestone: ${task.title}`,
        points: points.milestoneDone,
        at: task.doneAt,
      });
    }
  }

  for (const skill of inputs.provenSkills) {
    ledger.push({
      source: 'skill-proven',
      refId: skill.skillId,
      label: `Proved ${skill.name}`,
      points: points.skillProven,
      at: skill.provenAt,
    });
  }

  for (const certificate of inputs.certificates) {
    ledger.push({
      source: 'certificate',
      refId: certificate.id,
      label: `Certificate: ${certificate.title}`,
      points: points.certificate,
      at: certificate.issuedOn,
    });
  }

  for (const event of inputs.attendedEvents) {
    ledger.push({
      source: 'event-attended',
      refId: event.id,
      label: `Took part in ${event.title}`,
      points: event.type === 'hackathon' ? points.hackathonAttended : points.eventAttended,
      at: event.date,
    });

    if (event.outcome === 'finalist' || event.outcome === 'winner') {
      ledger.push({
        source: 'event-placed',
        refId: event.id,
        label: `${event.outcome === 'winner' ? 'Won' : 'Finalist at'} ${event.title}`,
        points: points.eventPlaced,
        at: event.date,
      });
    }
  }

  // Practice is pooled per ISO week and capped, so an all-nighter earns no more
  // than a steady week. Dated to the week's last practice day.
  const weeks = new Map<string, { minutes: number; last: string }>();
  for (const entry of inputs.practice) {
    const week = weekStart(entry.date);
    const current = weeks.get(week) ?? { minutes: 0, last: entry.date };
    current.minutes += entry.minutes;
    if (entry.date > current.last) current.last = entry.date;
    weeks.set(week, current);
  }
  for (const [week, { minutes, last }] of [...weeks.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const earned = Math.min(
      Math.floor(minutes / 30) * points.practicePerHalfHour,
      points.practiceWeeklyCap,
    );
    if (earned <= 0) continue;

    ledger.push({
      source: 'practice',
      refId: week,
      label: `Practice, week of ${week}`,
      points: earned,
      at: last,
    });
  }

  return ledger;
}

export interface MomentumTotals {
  total: number;
  building: number;
  learning: number;
  events: number;
}

/** Sums a ledger, optionally from `since` (inclusive, compared on the date part). */
export function summarise(
  entries: readonly Pick<LedgerEntry, 'source' | 'points' | 'at'>[],
  since?: string,
): MomentumTotals {
  const totals: MomentumTotals = { total: 0, building: 0, learning: 0, events: 0 };

  for (const entry of entries) {
    if (since && entry.at.slice(0, 10) < since) continue;
    totals.total += entry.points;
    totals[SOURCE_CATEGORY[entry.source]] += entry.points;
  }

  return totals;
}

/**
 * Standard competition ranking: equal values share a rank and the next distinct
 * value skips ahead (1, 2, 2, 4). Dense ranking would tell the fourth student
 * they are third, which is not what a rank means.
 */
export function assignRanks<T extends { value: number }>(
  sorted: readonly T[],
): (T & { rank: number })[] {
  let lastValue: number | null = null;
  let lastRank = 0;

  return sorted.map((entry, index) => {
    const rank = entry.value === lastValue ? lastRank : index + 1;
    lastValue = entry.value;
    lastRank = rank;
    return { ...entry, rank };
  });
}
