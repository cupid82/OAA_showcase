import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/Bits';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Select } from '@/components/ui/Field';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { Chip, Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import { monthName, yearLabel } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type {
  Leaderboard,
  LeaderboardCategory,
  LeaderboardRow,
  LeaderboardScope,
  LeaderboardWindow,
} from '@/types';

const CATEGORIES: { value: LeaderboardCategory; label: string }[] = [
  { value: 'overall', label: 'Overall' },
  { value: 'building', label: 'Building' },
  { value: 'learning', label: 'Learning' },
  { value: 'events', label: 'Showing up' },
];

const SCOPES: { value: LeaderboardScope; label: string }[] = [
  { value: 'college', label: 'The whole college' },
  { value: 'department', label: 'My department' },
  { value: 'year', label: 'My year' },
];

const BREAKDOWN: { key: 'building' | 'learning' | 'events'; label: string; className: string }[] = [
  { key: 'building', label: 'Building', className: 'bg-brand-600' },
  { key: 'learning', label: 'Learning', className: 'bg-brand-300' },
  { key: 'events', label: 'Showing up', className: 'bg-ink-400' },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardWindow>('month');
  const [category, setCategory] = useState<LeaderboardCategory>('overall');
  const [scope, setScope] = useState<LeaderboardScope>('college');
  const { data, error, loading, reload } = useApi<Leaderboard>(
    `/api/leaderboard?window=${period}&category=${category}&scope=${scope}`,
  );

  const monthLabel = monthName(new Date().getUTCMonth() + 1);

  return (
    <>
      <PageHeader
        eyebrow="Leaderboard"
        title="Momentum"
        description="Points for what you build, prove and show up to. Marks, attendance and job applications never count — and nobody is on the board unless they choose to be."
      />

      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink-300 pb-6">
        <div className="flex flex-wrap gap-2">
          <Chip active={period === 'month'} onClick={() => setPeriod('month')}>
            {monthLabel}
          </Chip>
          <Chip active={period === 'all'} onClick={() => setPeriod('all')}>
            All time
          </Chip>
        </div>
        <div className="w-full sm:w-60">
          <label htmlFor="lb-scope" className="kicker block text-ink-500">
            Ranked within
          </label>
          <Select
            id="lb-scope"
            value={scope}
            onChange={(event) => setScope(event.target.value as LeaderboardScope)}
          >
            {SCOPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Tabs
        className="mt-6"
        label="Category"
        value={category}
        onChange={setCategory}
        tabs={CATEGORIES}
      />

      {loading && !data && <Loading label="Ranking…" />}
      {error && !data && <ErrorMessage className="mt-6" message={error} onRetry={reload} />}

      {data && (
        <div
          className={cn(
            'mt-8 grid gap-x-12 gap-y-12 xl:grid-cols-[minmax(0,1fr)_20rem]',
            loading && 'opacity-60 transition-opacity',
          )}
        >
          <div className="min-w-0">
            <YouCard data={data} />

            {data.rows.length === 0 ? (
              <EmptyState
                className="mt-8"
                title="Nobody on the board yet"
                description={
                  period === 'month'
                    ? `No one has earned points in ${monthLabel} in this group so far. Ship a milestone and you could be first.`
                    : 'Nobody in this group has earned points yet.'
                }
              />
            ) : (
              <>
                {data.rows.length >= 3 && <Podium rows={data.rows.slice(0, 3)} />}
                <ol className="mt-8 border-t border-ink-300">
                  {data.rows.map((row) => (
                    <Row key={row.studentId} row={row} max={data.rows[0]?.points ?? 1} />
                  ))}
                </ol>
              </>
            )}

            <p className="mt-6 text-sm text-ink-500">
              {data.total} {data.total === 1 ? 'student' : 'students'} ranked within {data.within}.
              Equal points share a rank; the next distinct score skips ahead (1, 2, 2, 4). Students
              who stay private are left out entirely, not anonymised.
            </p>
          </div>

          <aside className="min-w-0">
            <HowPoints data={data} />
          </aside>
        </div>
      )}
    </>
  );
}

function YouCard({ data }: { data: Leaderboard }) {
  const { you } = data;
  return (
    <section className="drafting border border-ink-900 bg-ink-950 px-6 py-6 text-ink-100">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="kicker text-ink-400">You</p>
          <p className="mt-2 font-serif text-5xl leading-none text-ink-50">
            {you.rank ? `#${you.rank}` : '—'}
          </p>
          <p className="mt-2 text-sm text-ink-300">
            {you.visible
              ? you.rank
                ? `of ${data.total}, within ${data.within}`
                : 'No points in this view yet'
              : you.rank
                ? `where you’d be — you’re hidden from the board`
                : 'You’re hidden from the board'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-serif text-4xl leading-none text-ink-50">{you.points}</p>
          <p className="kicker mt-1.5 text-ink-400">points</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-t border-ink-800 pt-4 text-sm text-ink-300">
        <span>Building {you.breakdown.building}</span>
        <span>Learning {you.breakdown.learning}</span>
        <span>Showing up {you.breakdown.events}</span>
        {!you.visible && (
          <Link
            to="/student/settings#privacy"
            className="ml-auto text-brand-300 underline underline-offset-4 hover:text-brand-200"
          >
            Show me on the board
          </Link>
        )}
      </div>
    </section>
  );
}

function Podium({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <ol className="mt-8 grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-3">
      {rows.map((row) => (
        <li key={row.studentId} className={cn('bg-white px-5 py-5', row.isYou && 'bg-brand-50')}>
          <p className="font-serif text-4xl leading-none text-ink-900">{row.rank}</p>
          <p className="mt-3 text-ink-900">
            <Name row={row} />
          </p>
          <p className="text-xs text-ink-500">
            {row.department} · {yearLabel(row.year)}
          </p>
          <p className="mt-3 font-mono text-sm text-brand-700">{row.points} pts</p>
        </li>
      ))}
    </ol>
  );
}

function Name({ row }: { row: LeaderboardRow }) {
  if (row.handle) {
    return (
      <Link
        to={`/p/${row.handle}`}
        className="underline decoration-ink-300 underline-offset-4 hover:text-brand-700"
        title="Open their portfolio"
      >
        {row.name}
      </Link>
    );
  }
  return <>{row.name}</>;
}

function Row({ row, max }: { row: LeaderboardRow; max: number }) {
  const total = row.breakdown.building + row.breakdown.learning + row.breakdown.events || 1;

  return (
    <li
      className={cn(
        'grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-ink-200 py-3',
        row.isYou && 'bg-brand-50/70',
      )}
    >
      <span
        className={cn(
          'text-center font-serif text-xl',
          row.rank <= 3 ? 'text-ink-900' : 'text-ink-500',
        )}
      >
        {row.rank}
      </span>
      <div className="min-w-0">
        <p className="truncate text-ink-900">
          <Name row={row} />
          {row.isYou && (
            <Badge tone="brand" className="ml-2 align-middle">
              You
            </Badge>
          )}
        </p>
        <p className="text-xs text-ink-500">
          {row.department} · {yearLabel(row.year)}
        </p>
        {/* Where the points came from, as one stacked bar scaled to the leader. */}
        <div
          className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-ink-100"
          style={{ width: `${Math.max(8, (row.points / max) * 100)}%` }}
          aria-hidden="true"
        >
          {BREAKDOWN.map((part) => (
            <span
              key={part.key}
              className={part.className}
              style={{ width: `${(row.breakdown[part.key] / total) * 100}%` }}
            />
          ))}
        </div>
      </div>
      <span className="font-mono text-sm text-ink-900 tabular-nums">{row.points}</span>
    </li>
  );
}

function HowPoints({ data }: { data: Leaderboard }) {
  const points = data.pointsTable;
  const rows: [string, string][] = [
    ['Ship a project that tells its story', `${points.projectShipped}`],
    [
      'Tick off a milestone',
      `${points.milestoneDone} (up to ${points.milestoneCapPerProject} per project)`,
    ],
    ['Prove a skill', `${points.skillProven}`],
    ['Add a certificate', `${points.certificate}`],
    ['Take part in a hackathon', `${points.hackathonAttended}`],
    ['Take part in any other event', `${points.eventAttended}`],
    ['Finish as a finalist or winner', `+${points.eventPlaced}`],
    [
      'Practise, per half hour',
      `${points.practicePerHalfHour} (up to ${points.practiceWeeklyCap} a week)`,
    ],
  ];

  return (
    <section aria-labelledby="how-heading">
      <SectionHeading id="how-heading" title="How points work" />
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-ink-200">
              <td className="py-2.5 pr-3 text-ink-700">{label}</td>
              <td className="py-2.5 text-right font-mono text-xs text-ink-900">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-500">
        {BREAKDOWN.map((part) => (
          <span key={part.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('size-2.5', part.className)} />
            {part.label}
          </span>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        Practice caps out each week on purpose — rewarding all-nighters would reward burnout. Never
        counted: marks, attendance, and job applications (those are private).
      </p>
    </section>
  );
}
