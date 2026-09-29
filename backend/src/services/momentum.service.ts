/**
 * Momentum on real rows: recomputing a student's ledger after a write, and the
 * leaderboard over the stored ledgers.
 *
 * **Recompute on write, never on read.** Anything that changes an input — a
 * project shipped, a milestone ticked, a certificate added, an event attended,
 * practice logged — calls `recomputeMomentum`. The leaderboard is then a sum over
 * rows that already exist.
 */
import { getDb } from '../data/store.js';
import type { MomentumPoints, StudentRow } from '../data/types.js';
import { monthStart } from '../lib/dates.js';
import { assignRanks, summarise } from '../lib/momentum.js';
import type { MomentumTotals } from '../lib/momentum.js';
import type { LeaderboardQuery } from '../models/misc.model.js';
import { rebuildLedger } from './evidence.js';
import { findStudent, preferencesOf, today } from './shared.js';

/** Rebuilds the ledger for each student given. Does not persist. */
export function recomputeMomentum(...studentIds: string[]): void {
  const db = getDb();
  const now = today();
  for (const studentId of new Set(studentIds)) rebuildLedger(db, studentId, now);
}

export function momentumTotals(studentId: string, since?: string): MomentumTotals {
  return summarise(
    getDb().momentum.filter((row) => row.studentId === studentId),
    since,
  );
}

export interface LedgerView {
  source: string;
  label: string;
  points: number;
  at: string;
}

export function recentMomentum(studentId: string, limit = 6): LedgerView[] {
  return getDb()
    .momentum.filter((row) => row.studentId === studentId)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
    .map((row) => ({ source: row.source, label: row.label, points: row.points, at: row.at }));
}

// --- Leaderboard ------------------------------------------------------------------

export interface LeaderboardRow {
  rank: number;
  studentId: string;
  name: string;
  /** Present only when their portfolio is public — the name becomes a link. */
  handle: string | null;
  department: string;
  year: number;
  points: number;
  breakdown: Omit<MomentumTotals, 'total'>;
  isYou: boolean;
}

export interface Leaderboard {
  window: LeaderboardQuery['window'];
  category: LeaderboardQuery['category'];
  scope: LeaderboardQuery['scope'];
  within: string;
  since: string | null;
  rows: LeaderboardRow[];
  you: {
    points: number;
    breakdown: Omit<MomentumTotals, 'total'>;
    /** Your rank among visible students — or where you would be, if hidden. */
    rank: number | null;
    visible: boolean;
  };
  /** Students ranked. Only those with points in the window and a visible profile. */
  total: number;
  pointsTable: MomentumPoints;
}

function inScope(viewer: StudentRow, other: StudentRow, scope: LeaderboardQuery['scope']): boolean {
  if (scope === 'college') return true;
  if (scope === 'department') return other.department === viewer.department;
  return other.year === viewer.year;
}

export function getLeaderboard(viewerId: string, query: LeaderboardQuery): Leaderboard {
  const db = getDb();
  const viewer = findStudent(viewerId);
  const since = query.window === 'month' ? monthStart(today()) : undefined;

  const valueOf = (totals: MomentumTotals) =>
    query.category === 'overall' ? totals.total : totals[query.category];

  const entries = db.students
    .filter((student) => student.onboardedAt !== null && inScope(viewer, student, query.scope))
    .map((student) => {
      const totals = momentumTotals(student.id, since);
      const prefs = preferencesOf(student.id);
      return {
        student,
        totals,
        value: valueOf(totals),
        visible: prefs.leaderboardVisible,
        portfolioPublic: prefs.portfolioPublic,
      };
    });

  // Hidden students are left out entirely — not anonymised, not ranked. Nobody
  // is on a public board without choosing to be.
  const ranked = assignRanks(
    entries
      .filter((entry) => entry.visible && entry.value > 0)
      .sort((a, b) => b.value - a.value || a.student.name.localeCompare(b.student.name)),
  );

  const breakdownOf = ({ building, learning, events }: MomentumTotals) => ({
    building,
    learning,
    events,
  });

  const rows: LeaderboardRow[] = ranked.map((entry) => ({
    rank: entry.rank,
    studentId: entry.student.id,
    name: entry.student.name,
    handle: entry.portfolioPublic ? entry.student.handle : null,
    department: entry.student.department,
    year: entry.student.year,
    points: entry.value,
    breakdown: breakdownOf(entry.totals),
    isYou: entry.student.id === viewerId,
  }));

  const self = entries.find((entry) => entry.student.id === viewerId);
  const selfValue = self?.value ?? 0;
  const selfRow = rows.find((row) => row.isYou);
  // A hidden viewer still sees where they would stand: one more than everyone
  // strictly ahead of them.
  const wouldBe = selfValue > 0 ? rows.filter((row) => row.points > selfValue).length + 1 : null;

  const within =
    query.scope === 'college'
      ? 'the whole college'
      : query.scope === 'department'
        ? viewer.department
        : `year ${viewer.year}`;

  return {
    window: query.window,
    category: query.category,
    scope: query.scope,
    within,
    since: since ?? null,
    rows,
    you: {
      points: selfValue,
      breakdown: self ? breakdownOf(self.totals) : { building: 0, learning: 0, events: 0 },
      rank: selfRow?.rank ?? wouldBe,
      visible: self?.visible ?? false,
    },
    total: rows.length,
    pointsTable: db.settings.momentumPoints,
  };
}
