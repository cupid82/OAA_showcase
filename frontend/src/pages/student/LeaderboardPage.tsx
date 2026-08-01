import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import type { Leaderboard, LeaderboardCategory, LeaderboardRow, LeaderboardScope } from '@/types';

const SCOPES: { value: LeaderboardScope; label: string }[] = [
  { value: 'college', label: 'College' },
  { value: 'department', label: 'Department' },
  { value: 'section', label: 'My section' },
];

const CATEGORIES: { value: LeaderboardCategory; label: string }[] = [
  { value: 'oaa', label: 'Overall ability' },
  { value: 'academic', label: 'Academic' },
  { value: 'adaptability', label: 'Adaptability' },
  { value: 'physical', label: 'Physical' },
  { value: 'social', label: 'Social' },
  { value: 'attendance', label: 'Attendance' },
];

/** Rank badge. The top three get weight; everyone else gets a plain number. */
function Rank({ rank, isYou }: { rank: number; isYou: boolean }) {
  const podium = rank <= 3;

  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center text-sm tabular-nums',
        podium && 'border font-medium',
        podium && !isYou && 'border-ink-300 bg-ink-100 text-ink-800',
        podium && isYou && 'border-brand-600 bg-brand-600 text-white',
        !podium && 'text-ink-500',
      )}
    >
      {rank}
    </span>
  );
}

export default function LeaderboardPage() {
  const [scope, setScope] = useState<LeaderboardScope>('college');
  const [category, setCategory] = useState<LeaderboardCategory>('oaa');
  const [search, setSearch] = useState('');

  const path = `/api/students/me/leaderboard?scope=${scope}&category=${category}`;
  const { data, error, loading, reload } = useApi<Leaderboard>(path);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle || !data) return data?.rows ?? [];

    return data.rows.filter(
      (row) => row.rollNo.toLowerCase().includes(needle) || row.name.toLowerCase().includes(needle),
    );
  }, [data, search]);

  /** Shown separately when a filter or a long list hides the viewer's own row. */
  const youHidden = data?.you && !rows.some((row) => row.isYou);

  return (
    <>
      <PageHeader
        title="Leaderboard"
        description="How you rank across the abilities this portal records."
      />

      {/* One filter row above everything it scopes, never inside a card. */}
      <div className="grid gap-6 border-b border-ink-300 pb-6 sm:grid-cols-3">
        <div>
          <label htmlFor="lb-scope" className="kicker block text-ink-500">
            Ranked within
          </label>
          <select
            id="lb-scope"
            value={scope}
            onChange={(event) => setScope(event.target.value as LeaderboardScope)}
            className="w-full border-b border-ink-300 bg-transparent py-2.5 text-ink-900 transition focus:border-brand-600"
          >
            {SCOPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lb-category" className="kicker block text-ink-500">
            Ranked by
          </label>
          <select
            id="lb-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as LeaderboardCategory)}
            className="w-full border-b border-ink-300 bg-transparent py-2.5 text-ink-900 transition focus:border-brand-600"
          >
            {CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lb-search" className="kicker block text-ink-500">
            Find a student
          </label>
          <input
            id="lb-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Roll number or name"
            className="w-full border-b border-ink-300 bg-transparent py-2.5 text-ink-900 transition placeholder:text-ink-400 focus:border-brand-600"
          />
        </div>
      </div>

      {loading && <Loading variant="page" label="Ranking…" />}
      {error && <ErrorMessage message={error} onRetry={reload} />}

      {data && (
        <>
          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <p className="text-ink-600">
              {data.label} across {data.within} — {data.total}{' '}
              {data.total === 1 ? 'student' : 'students'}
            </p>
            {data.you && (
              <p className="text-sm text-ink-600">
                You are{' '}
                <span className="font-medium text-ink-900">
                  #{data.you.rank} of {data.total}
                </span>
              </p>
            )}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              className="mt-6"
              title="Nobody matches"
              description={`No student in this ranking matches “${search.trim()}”.`}
            />
          ) : (
            <ul className="mt-4 border-t border-ink-300">
              {rows.map((row) => (
                <Row key={row.studentId} row={row} category={category} />
              ))}
            </ul>
          )}

          {youHidden && data.you && (
            <>
              <p className="mt-6 text-sm text-ink-500">Your position</p>
              <ul className="mt-2 border-t border-ink-300">
                <Row row={data.you} category={category} />
              </ul>
            </>
          )}

          <p className="mt-10 border-t border-ink-300 pt-5 text-sm text-ink-500">
            Equal scores share a rank, and the next distinct score takes the place after them — two
            students tied at 2nd are followed by a 4th, not a 3rd. Students with nothing recorded
            yet are listed last rather than removed, so the ranks above them stay honest.
          </p>
        </>
      )}
    </>
  );
}

function Row({ row, category }: { row: LeaderboardRow; category: LeaderboardCategory }) {
  const suffix = category === 'attendance' ? '%' : '';

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ink-200 py-3',
        row.isYou && 'bg-brand-50/70',
      )}
    >
      <Rank rank={row.rank} isYou={row.isYou} />

      <div className="min-w-0 flex-1">
        <p className="text-ink-900">
          <span className="font-mono text-sm text-ink-600">{row.rollNo}</span>
          <span className="ml-3">{row.name}</span>
          {row.isYou && (
            <span className="kicker ml-3 border border-brand-300 bg-white px-1.5 py-0.5 text-brand-700">
              You
            </span>
          )}
        </p>
        <p className="mt-0.5 text-sm text-ink-500">
          Semester {row.semester} · Section {row.section}
        </p>
      </div>

      <div className="text-right">
        <p className="tabular-nums text-ink-900">
          {row.value === null ? (
            <span className="text-ink-400">Not scored</span>
          ) : (
            `${row.value}${suffix}`
          )}
        </p>
        {row.grade && <p className="font-mono text-xs text-ink-500">Grade {row.grade}</p>}
      </div>
    </li>
  );
}
