import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import type { Timetable, TimetableDay, TimetableEntry } from '@/types';

/** Monday is 1; `getDay()` returns 0 for Sunday, so weekends map to no column. */
function todayColumn(now: Date): number {
  const day = now.getDay();
  return day >= 1 && day <= 5 ? day : 0;
}

/**
 * Minutes-from-midnight for a period's start and end.
 *
 * The label is authored text ("09:00 – 09:55"), so this reads the two clock
 * times out of it rather than assuming a separator — an en dash, a hyphen or the
 * word "to" all parse the same way. Anything it cannot read returns null and the
 * period simply never counts as current, which is the safe failure.
 */
function parseRange(label: string | undefined): { start: number; end: number } | null {
  if (!label) return null;
  const clock = [...label.matchAll(/(\d{1,2}):(\d{2})/g)];
  if (clock.length < 2) return null;

  const minutes = (match: RegExpMatchArray) => Number(match[1]) * 60 + Number(match[2]);
  const start = minutes(clock[0]!);
  const end = minutes(clock[1]!);
  return end > start ? { start, end } : null;
}

interface Upcoming {
  entry: TimetableEntry;
  day: TimetableDay;
  /** True when the class is running right now rather than later. */
  live: boolean;
}

/**
 * What a student actually opens this page for: the class happening now, or the
 * next one. Scans forward from today and wraps around the week, so a Friday
 * evening shows Monday's first period rather than nothing.
 */
function findUpcoming(data: Timetable, now: Date): Upcoming | null {
  const today = todayColumn(now);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const ordered = [...data.days].sort((a, b) => a.day - b.day);

  for (let offset = 0; offset < 7; offset += 1) {
    // Before Monday (weekend) the search starts at day 1 rather than at day 0.
    const target = today === 0 ? 1 + offset : ((today - 1 + offset) % 5) + 1;
    const day = ordered.find((candidate) => candidate.day === target);
    if (!day) continue;

    const periods = [...day.periods].sort((a, b) => a.period - b.period);
    for (const entry of periods) {
      const range = parseRange(data.periodTimes[entry.period]);
      const isToday = offset === 0 && today !== 0;

      if (!isToday) return { entry, day, live: false };
      if (range && minutesNow >= range.start && minutesNow < range.end) {
        return { entry, day, live: true };
      }
      if (range && minutesNow < range.start) return { entry, day, live: false };
      if (!range) return { entry, day, live: false };
    }
  }

  return null;
}

function Cell({ entry, today }: { entry: TimetableEntry | undefined; today: boolean }) {
  /*
    A free period is drawn as free. The old em dash was a character doing the job
    of white space, and five of them in a row read as data.
  */
  if (!entry) {
    return (
      <td className={cn('px-4 py-3.5 align-top', today && 'bg-brand-50/70')}>
        <span className="sr-only">Free</span>
      </td>
    );
  }

  return (
    <td className={cn('px-4 py-3.5 align-top', today && 'bg-brand-50/70')}>
      <span className="block font-mono text-[0.6875rem] tracking-wide text-ink-500">
        {entry.code}
      </span>
      <span className="mt-1 block text-sm leading-snug font-medium text-ink-900">{entry.name}</span>
      <span className="mt-1.5 block text-xs leading-snug text-ink-500">
        {entry.room}
        {entry.teacher && <span className="text-ink-400"> · {entry.teacher}</span>}
      </span>
    </td>
  );
}

export default function TimetablePage() {
  const { data, error, loading, reload } = useApi<Timetable>('/api/students/me/timetable');

  /*
    Ticks once a minute so "on now" stays true without a reload. Storing the clock
    in state rather than reading `new Date()` during render keeps the highlight and
    the header in agreement — two calls a millisecond apart can straddle a period
    boundary and disagree.
  */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading) return <Loading variant="page" label="Loading your timetable…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  if (!data || data.periodNumbers.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Weekly schedule" title="Timetable" />
        <EmptyState
          title="No timetable published yet"
          description="Your weekly schedule appears here once the department publishes it for this semester."
        />
      </>
    );
  }

  const current = todayColumn(now);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const upcoming = findUpcoming(data, now);

  const byDayPeriod = new Map<string, TimetableEntry>();
  for (const day of data.days) {
    for (const entry of day.periods) byDayPeriod.set(`${day.day}-${entry.period}`, entry);
  }

  /** The period running right now, or 0 — drives the row marker. */
  const livePeriod =
    current === 0
      ? 0
      : (data.periodNumbers.find((period) => {
          const range = parseRange(data.periodTimes[period]);
          return range ? minutesNow >= range.start && minutesNow < range.end : false;
        }) ?? 0);

  return (
    <>
      <PageHeader
        eyebrow={`Semester ${data.semester} · Section ${data.section}`}
        title="Timetable"
        description="Periods run Monday to Friday. Attendance is recorded against them."
      />

      {/*
        The answer to the question the page is opened with, above the grid that
        answers every other one.
      */}
      {upcoming && (
        <section className="relative mb-8 border border-ink-300 bg-white px-6 py-5">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-brand-600" />
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="kicker flex items-center gap-2 text-brand-700">
              {upcoming.live && (
                <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-600" />
              )}
              {upcoming.live ? 'On now' : 'Up next'}
            </p>
            <p className="font-mono text-xs text-ink-500">
              {upcoming.day.name} · {data.periodTimes[upcoming.entry.period]}
            </p>
          </div>

          <p className="mt-2 font-serif text-2xl text-ink-900">{upcoming.entry.name}</p>
          <p className="mt-1 text-sm text-ink-600">
            <span className="font-mono text-xs text-ink-500">{upcoming.entry.code}</span> ·{' '}
            {upcoming.entry.room}
            {upcoming.entry.teacher && ` · ${upcoming.entry.teacher}`}
          </p>
        </section>
      )}

      {/*
        Wider than a phone: the grid scrolls inside its box, the page never does.

        `contain:paint` is what actually holds that second half. Without it this
        table's overflow escaped the scroll box and widened the document itself —
        measured at 844px against a 430px viewport. `overflow-x:hidden` did not
        contain it and the sticky column was not the cause; scoping the paint is.
      */}
      <div className="overflow-x-auto border border-ink-300 bg-white [contain:paint]">
        <table className="w-full min-w-[62rem] border-collapse">
          <caption className="sr-only">
            Weekly class timetable for semester {data.semester}, section {data.section}
          </caption>
          <thead>
            <tr className="border-b border-ink-300">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-[0.6875rem] font-semibold tracking-[0.07em] text-ink-500 uppercase"
              >
                Period
              </th>
              {data.days.map((day) => {
                const isToday = day.day === current;
                return (
                  <th
                    key={day.day}
                    scope="col"
                    aria-current={isToday ? 'date' : undefined}
                    className={cn(
                      'px-4 py-3 text-left align-bottom',
                      isToday ? 'bg-brand-50' : 'bg-white',
                    )}
                  >
                    <span
                      className={cn(
                        'flex items-baseline gap-2 text-[0.6875rem] font-semibold tracking-[0.07em] uppercase',
                        isToday ? 'text-brand-700' : 'text-ink-500',
                      )}
                    >
                      {day.name}
                      {isToday && <span className="normal-case">Today</span>}
                    </span>
                    {/* Day load — the shape of the week, readable without counting cells. */}
                    <span className="mt-1 block text-xs font-normal text-ink-400">
                      {day.periods.length} {day.periods.length === 1 ? 'class' : 'classes'}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.periodNumbers.map((period) => {
              const isLive = period === livePeriod;

              return (
                <tr key={period} className="border-b border-ink-200 last:border-b-0">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-white px-4 py-3.5 text-left align-top"
                  >
                    <span className="flex items-center gap-2">
                      {isLive && (
                        <span
                          aria-hidden="true"
                          className="size-1.5 shrink-0 rounded-full bg-brand-600"
                        />
                      )}
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isLive ? 'text-brand-700' : 'text-ink-900',
                        )}
                      >
                        Period {period}
                      </span>
                    </span>
                    <span className="mt-1 block font-mono text-xs text-ink-500">
                      {data.periodTimes[period]}
                    </span>
                    {isLive && <span className="sr-only">Currently running</span>}
                  </th>

                  {data.days.map((day) => (
                    <Cell
                      key={day.day}
                      entry={byDayPeriod.get(`${day.day}-${period}`)}
                      today={day.day === current}
                    />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-6 max-w-2xl text-sm text-ink-500">
        If a class here does not match what your teacher marked, the attendance record is the one
        that counts — raise it with them.
      </p>
    </>
  );
}
