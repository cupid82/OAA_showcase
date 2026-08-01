import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import type { Timetable, TimetableEntry } from '@/types';

/** Monday is 1; `getDay()` returns 0 for Sunday, so weekends map to no column. */
function todayColumn(): number {
  const day = new Date().getDay();
  return day >= 1 && day <= 5 ? day : 0;
}

function Cell({ entry }: { entry: TimetableEntry | undefined }) {
  if (!entry) {
    return <span className="block px-3 py-3 text-sm text-ink-300">—</span>;
  }

  return (
    <span className="block px-3 py-3">
      <span className="block font-mono text-xs text-ink-600">{entry.code}</span>
      <span className="mt-1 block text-sm leading-snug text-ink-900">{entry.name}</span>
      <span className="mt-1 block text-xs text-ink-500">{entry.room}</span>
    </span>
  );
}

export default function TimetablePage() {
  const { data, error, loading, reload } = useApi<Timetable>('/api/students/me/timetable');
  const current = todayColumn();

  if (loading) return <Loading variant="page" label="Loading your timetable…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  if (!data || data.periodNumbers.length === 0) {
    return (
      <>
        <PageHeader title="Timetable" description="Your weekly class schedule." />
        <EmptyState
          title="No timetable published yet"
          description="Your weekly schedule appears here once the department publishes it for this semester."
        />
      </>
    );
  }

  const byDayPeriod = new Map<string, TimetableEntry>();
  for (const day of data.days) {
    for (const entry of day.periods) byDayPeriod.set(`${day.day}-${entry.period}`, entry);
  }

  return (
    <>
      <PageHeader
        title="Timetable"
        description={`Semester ${data.semester}, section ${data.section} — periods run Monday to Friday.`}
      />

      {/* Wider than a phone: the grid scrolls inside its box, the page never does. */}
      <div className="overflow-x-auto border border-ink-300 bg-white">
        <table className="w-full min-w-[52rem] border-collapse">
          <caption className="sr-only">
            Weekly class timetable for semester {data.semester}, section {data.section}
          </caption>
          <thead>
            <tr className="border-b border-ink-300">
              <th scope="col" className="kicker px-3 py-3 text-left text-ink-500">
                Period
              </th>
              {data.days.map((day) => (
                <th
                  key={day.day}
                  scope="col"
                  className={cn(
                    'kicker px-3 py-3 text-left',
                    day.day === current ? 'text-brand-700' : 'text-ink-500',
                  )}
                >
                  {day.name}
                  {day.day === current && <span className="ml-2 normal-case">· today</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.periodNumbers.map((period) => (
              <tr key={period} className="border-b border-ink-200 last:border-b-0">
                <th scope="row" className="px-3 py-3 text-left align-top">
                  <span className="block text-sm text-ink-900">Period {period}</span>
                  <span className="mt-1 block font-mono text-xs text-ink-500">
                    {data.periodTimes[period]}
                  </span>
                </th>
                {data.days.map((day) => (
                  <td
                    key={day.day}
                    className={cn('align-top', day.day === current && 'bg-brand-50/60')}
                  >
                    <Cell entry={byDayPeriod.get(`${day.day}-${period}`)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-ink-500">
        Attendance is recorded against these periods. If a class here does not match what your
        teacher marked, the attendance record is the one that counts — raise it with them.
      </p>
    </>
  );
}
