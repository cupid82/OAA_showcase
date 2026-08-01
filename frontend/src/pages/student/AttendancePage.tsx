import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import type { AttendanceSummary, MonthlyAttendance } from '@/types';

/**
 * Two bar fills: on track and below the threshold. Validated for contrast and for
 * deuteran/tritan separation against a white surface — but colour is never the
 * only signal here. The labelled 75% reference line and the printed percentages
 * carry the same information.
 */
const BAR_OK = '#7a81c9'; // brand-500
const BAR_LOW = '#b4483c';

const AXIS = '#b2a996'; // ink-400
const GRID = '#e9e3d8'; // ink-200

function barFill(percentage: number, threshold: number) {
  return percentage < threshold ? BAR_LOW : BAR_OK;
}

function MonthlyChart({ data, threshold }: { data: MonthlyAttendance[]; threshold: number }) {
  return (
    <figure className="mt-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 4, left: -16 }}
            barCategoryGap="28%"
          >
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: GRID }}
              tick={{ fill: AXIS, fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS, fontSize: 12 }}
              unit="%"
            />
            <ReferenceLine
              y={threshold}
              stroke={BAR_LOW}
              strokeDasharray="4 4"
              label={{
                value: `${threshold}% required`,
                position: 'insideTopRight',
                fill: BAR_LOW,
                fontSize: 11,
              }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(43, 39, 32, 0.05)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as MonthlyAttendance | undefined;
                if (!point) return null;

                return (
                  <div className="border border-ink-300 bg-white px-3 py-2 text-sm shadow-card">
                    <p className="kicker text-ink-500">{point.label}</p>
                    <p className="mt-1 font-medium text-ink-900">{point.percentage}% attended</p>
                    <p className="text-ink-600">
                      {point.attended} of {point.held} classes
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="percentage" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((month) => (
                <Cell key={month.month} fill={barFill(month.percentage, threshold)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="mt-3 text-sm text-ink-500">
        Attendance per month across the current semester. Bars below the dashed line fall short of
        the {threshold}% requirement.
      </figcaption>

      {/* Same numbers, reachable without seeing the chart. */}
      <table className="sr-only">
        <caption>Monthly attendance percentage</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Attended</th>
            <th scope="col">Classes held</th>
            <th scope="col">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {data.map((month) => (
            <tr key={month.month}>
              <th scope="row">{month.label}</th>
              <td>{month.attended}</td>
              <td>{month.held}</td>
              <td>{month.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export default function AttendancePage() {
  const { data, error, loading, reload } = useApi<AttendanceSummary>('/api/students/me/attendance');

  if (loading) return <Loading variant="page" label="Loading your attendance…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  if (!data || data.overall.held === 0) {
    return (
      <>
        <PageHeader title="Attendance" description="Overall percentage and subject breakdown." />
        <EmptyState
          title="No classes recorded yet"
          description="Your attendance appears here once teachers begin marking classes for this semester."
        />
      </>
    );
  }

  const { overall, threshold, belowThreshold } = data;

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Calculated from every class marked this semester."
      />

      {belowThreshold && (
        <div
          role="alert"
          className="mb-8 border-l-2 border-red-500 bg-red-50/70 px-4 py-3.5 text-red-800"
        >
          <p className="kicker">Below the {threshold}% requirement</p>
          <p className="mt-1.5 text-sm text-red-700">
            Your attendance is {overall.percentage}%. You need at least {threshold}% to be eligible
            to sit this semester's examinations. Speak to your class advisor.
          </p>
        </div>
      )}

      <div className="grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-3">
        <div
          className={cn(
            'border-t-2 bg-white px-5 py-4',
            belowThreshold ? 'border-red-500' : 'border-brand-400',
          )}
        >
          <p className="kicker text-ink-500">Overall</p>
          <p
            className={cn(
              'mt-2 font-serif text-3xl',
              belowThreshold ? 'text-red-700' : 'text-ink-900',
            )}
          >
            {overall.percentage}%
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {overall.attended} of {overall.held} classes
          </p>
        </div>
        <div className="border-t-2 border-ink-300 bg-white px-5 py-4">
          <p className="kicker text-ink-500">Required</p>
          <p className="mt-2 font-serif text-3xl text-ink-900">{threshold}%</p>
          <p className="mt-1 text-sm text-ink-500">To sit the examinations</p>
        </div>
        <div className="border-t-2 border-ink-300 bg-white px-5 py-4">
          <p className="kicker text-ink-500">Classes missed</p>
          <p className="mt-2 font-serif text-3xl text-ink-900">{overall.held - overall.attended}</p>
          <p className="mt-1 text-sm text-ink-500">Across {data.subjects.length} subjects</p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-xl text-ink-900">Monthly trend</h2>
        <MonthlyChart data={data.monthly} threshold={threshold} />
      </section>

      <section className="mt-12">
        <h2 className="border-b border-ink-300 pb-3 font-serif text-xl text-ink-900">By subject</h2>
        <ul>
          {data.subjects.map((subject) => (
            <li key={subject.subjectId} className="border-b border-ink-200 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-ink-900">
                  <span className="font-mono text-sm text-ink-600">{subject.code}</span>
                  <span className="ml-3">{subject.name}</span>
                </p>
                <p className="text-sm text-ink-600">
                  <span
                    className={cn(
                      'font-medium tabular-nums',
                      subject.belowThreshold ? 'text-red-700' : 'text-ink-900',
                    )}
                  >
                    {subject.percentage}%
                  </span>
                  <span className="text-ink-400">
                    {' · '}
                    {subject.attended}/{subject.held}
                  </span>
                </p>
              </div>

              <div className="relative mt-2.5 h-1.5 w-full bg-ink-200">
                <div
                  className={cn('h-full', subject.belowThreshold ? 'bg-red-500' : 'bg-brand-500')}
                  style={{ width: `${Math.min(subject.percentage, 100)}%` }}
                />
                {/* The threshold, marked on every bar so shortfalls are visible at a glance. */}
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-full w-px bg-ink-500"
                  style={{ left: `${threshold}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {data.recentAbsences.length > 0 && (
        <section className="mt-12">
          <h2 className="border-b border-ink-300 pb-3 font-serif text-xl text-ink-900">
            Recent absences
          </h2>
          <ul className="mt-1">
            {data.recentAbsences.map((absence) => (
              <li
                key={`${absence.date}-${absence.code}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-ink-200 py-3 text-sm"
              >
                <span className="text-ink-900">
                  <span className="font-mono text-ink-600">{absence.code}</span>
                  <span className="ml-3">{absence.name}</span>
                </span>
                <span className="tabular-nums text-ink-500">{formatDate(absence.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 border-t border-ink-300 pt-5 text-sm text-ink-500">
        Attendance is recorded one row per subject, per day. The percentages above are counted from
        those records each time this page loads, so a correction by your teacher shows up here
        immediately.
      </p>
    </>
  );
}
