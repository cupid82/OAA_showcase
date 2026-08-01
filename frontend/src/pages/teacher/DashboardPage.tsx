import { Link } from 'react-router-dom';

import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { useApi } from '@/lib/useApi';
import type { TeacherDashboard } from '@/types';

import { classLink } from './ClassesPage';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  const name = MONTHS[Number(month) - 1];
  if (!year || !day || !name) return iso;
  return `${Number(day)} ${name} ${year}`;
}

/** `2026-08-01T09:14:22Z` → `1 Aug, 09:14`. */
function formatTimestamp(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;

  return `${at.getDate()} ${MONTHS[at.getMonth()]?.slice(0, 3) ?? ''}, ${String(
    at.getHours(),
  ).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
}

const SHORTCUTS: { to: string; icon: IconName; label: string }[] = [
  { to: '/teacher/classes', icon: 'book', label: 'My classes' },
  { to: '/teacher/marks', icon: 'clipboard', label: 'Marks entry' },
  { to: '/teacher/students', icon: 'users', label: 'Students' },
];

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="border-t-2 border-brand-400 bg-white px-5 py-4">
      <p className="kicker text-ink-500">{label}</p>
      <p className="mt-2 font-serif text-3xl text-ink-900">{value}</p>
      <p className="mt-1 text-sm text-ink-500">{hint}</p>
    </div>
  );
}

export default function TeacherDashboardPage() {
  const { data, error, loading, reload } = useApi<TeacherDashboard>('/api/teachers/me');

  if (loading) return <Loading variant="page" label="Loading your dashboard…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return null;

  const firstName = data.teacher.name.replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0];

  return (
    <>
      <PageHeader
        title={`Good day, ${firstName}`}
        description={`${data.teacher.designation} · ${data.teacher.department} · ${formatDate(data.date)}`}
      />

      <div className="grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-3">
        <Stat label="Classes" value={data.classCount} hint="Subject and section pairs" />
        <Stat label="Subjects" value={data.subjectCount} hint="Distinct subjects you teach" />
        <Stat label="Students" value={data.studentCount} hint="Across all your classes" />
      </div>

      <section className="mt-12">
        <h2 className="border-b border-ink-300 pb-3 font-serif text-xl text-ink-900">
          Attendance still to mark today
        </h2>

        {data.unmarkedToday.length === 0 ? (
          <p className="mt-4 flex items-center gap-3 text-ink-600">
            <Icon name="sparkle" className="size-5 text-brand-600" />
            Every class you teach has been marked for {formatDate(data.date)}.
          </p>
        ) : (
          <ul className="mt-1">
            {data.unmarkedToday.map((entry) => (
              <li key={entry.assignmentId} className="border-b border-ink-200">
                <Link
                  to={classLink('attendance', entry)}
                  className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-4 transition hover:bg-white"
                >
                  <span className="text-ink-900">
                    <span className="font-mono text-sm text-ink-600">{entry.code}</span>
                    <span className="ml-3">{entry.name}</span>
                    <span className="ml-3 text-sm text-ink-500">Section {entry.section}</span>
                  </span>
                  <span className="kicker flex items-center gap-2 text-brand-700">
                    Mark {entry.studentCount}
                    <span
                      aria-hidden="true"
                      className="h-px w-6 bg-brand-400 transition-all group-hover:w-10"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="border-b border-ink-300 pb-3 font-serif text-xl text-ink-900">
          Your recent changes
        </h2>

        {data.recentActivity.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">
            Nothing yet. Every attendance and marks change you make is recorded here and in the
            audit trail.
          </p>
        ) : (
          <ul className="mt-1">
            {data.recentActivity.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink-200 py-3 text-sm"
              >
                <span className="text-ink-900">
                  <span className="font-mono text-ink-600">{entry.rollNo}</span>
                  <span className="ml-3">{entry.summary}</span>
                </span>
                <span className="tabular-nums text-ink-500">{formatTimestamp(entry.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-12 grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-3">
        {SHORTCUTS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group flex items-center gap-3 bg-white px-5 py-4 transition hover:bg-ink-50"
          >
            <Icon
              name={link.icon}
              className="size-5 text-ink-400 transition group-hover:text-brand-600"
            />
            <span className="kicker text-ink-800">{link.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
