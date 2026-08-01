import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { useApi } from '@/lib/useApi';
import type { TeacherClass } from '@/types';

/** Deep link into attendance or marks with the class already chosen. */
export function classLink(page: 'attendance' | 'marks', entry: TeacherClass): string {
  return `/teacher/${page}?subject=${encodeURIComponent(entry.subjectId)}&section=${encodeURIComponent(entry.section)}`;
}

export default function TeacherClassesPage() {
  const { data, error, loading, reload } = useApi<TeacherClass[]>('/api/teachers/me/classes');

  if (loading) return <Loading variant="page" label="Loading your classes…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  if (!data || data.length === 0) {
    return (
      <>
        <PageHeader title="My classes" description="Subjects and sections assigned to you." />
        <EmptyState
          title="No classes assigned to you"
          description="An administrator assigns subjects and sections. Yours will appear here as soon as they do."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="My classes"
        description="Each row is one subject taught to one section — the unit everything else on this portal is keyed to."
      />

      <ul className="grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-2">
        {data.map((entry) => (
          <li key={entry.assignmentId} className="bg-white px-5 py-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-sm text-ink-600">{entry.code}</p>
              <span
                className={`kicker ${entry.markedToday ? 'text-brand-600' : 'text-ink-400'}`}
                title={
                  entry.markedToday
                    ? 'Attendance recorded for today'
                    : 'No attendance recorded for today yet'
                }
              >
                {entry.markedToday ? 'Marked today' : 'Not marked today'}
              </span>
            </div>

            <p className="mt-2 font-serif text-xl text-ink-900">{entry.name}</p>
            <p className="mt-1 text-sm text-ink-600">
              Section {entry.section} · Semester {entry.semester} · {entry.credits} credits ·{' '}
              {entry.studentCount} {entry.studentCount === 1 ? 'student' : 'students'}
            </p>

            <div className="mt-5 flex gap-5">
              <Link
                to={classLink('attendance', entry)}
                className="kicker text-brand-700 underline underline-offset-4 hover:text-brand-600"
              >
                Attendance
              </Link>
              <Link
                to={classLink('marks', entry)}
                className="kicker text-brand-700 underline underline-offset-4 hover:text-brand-600"
              >
                Marks
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-ink-500">
        You can only mark attendance or enter marks for the classes listed here. The server checks
        the same list on every write.
      </p>
    </>
  );
}
