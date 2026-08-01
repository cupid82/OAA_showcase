import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import type { AssignmentsSummary, StudentAssignment } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

/** Whole days from today to the due date. Negative means it has passed. */
function daysUntil(iso: string): number {
  const due = Date.parse(`${iso}T00:00:00Z`);
  const now = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((due - now) / 86_400_000);
}

/**
 * Status is carried by a word first and a colour second. "Overdue" in red that
 * still says "Overdue" is readable to someone who cannot see the red.
 */
function StatusBadge({ assignment }: { assignment: StudentAssignment }) {
  const { status, overdue } = assignment;

  const [label, style] = overdue
    ? ['Overdue', 'border-red-300 bg-red-50 text-red-800']
    : status === 'graded'
      ? ['Graded', 'border-brand-300 bg-brand-50 text-brand-700']
      : status === 'submitted'
        ? ['Submitted', 'border-ink-300 bg-ink-100 text-ink-700']
        : status === 'late'
          ? ['Submitted late', 'border-accent-500 bg-accent-400/15 text-accent-600']
          : ['Not submitted', 'border-ink-300 bg-white text-ink-600'];

  return <span className={cn('kicker border px-2 py-1', style)}>{label}</span>;
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'alert' }) {
  return (
    <div
      className={cn(
        'border-t-2 bg-white px-5 py-4',
        tone === 'alert' && value > 0 ? 'border-red-500' : 'border-brand-400',
      )}
    >
      <p className="kicker text-ink-500">{label}</p>
      <p
        className={cn(
          'mt-2 font-serif text-3xl',
          tone === 'alert' && value > 0 ? 'text-red-700' : 'text-ink-900',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function AssignmentsPage() {
  const { data, error, loading, reload } = useApi<AssignmentsSummary>(
    '/api/students/me/assignments',
  );

  if (loading) return <Loading variant="page" label="Loading your assignments…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  if (!data || data.assignments.length === 0) {
    return (
      <>
        <PageHeader title="Assignments" description="Submissions and grades." />
        <EmptyState
          title="No assignments set"
          description="Work set by your subject teachers appears here with its deadline and grade."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Everything set this semester, with what you still owe at the top."
      />

      <div className="grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-3">
        <Stat label="Still to submit" value={data.pending} />
        <Stat label="Overdue" value={data.overdue} tone="alert" />
        <Stat label="Graded" value={data.graded} />
      </div>

      <ul className="mt-10">
        {data.assignments.map((assignment) => {
          const days = daysUntil(assignment.dueDate);
          const owed = assignment.status === 'pending';

          return (
            <li key={assignment.id} className="border-b border-ink-200 py-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm text-ink-600">{assignment.code}</span>
                <StatusBadge assignment={assignment} />
                {owed && !assignment.overdue && days >= 0 && (
                  <span className="text-sm text-ink-500">
                    {days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `${days} days left`}
                  </span>
                )}
              </div>

              <h2 className="mt-3 font-serif text-xl text-ink-900">{assignment.title}</h2>
              <p className="prose-measure mt-2 text-ink-700">{assignment.description}</p>

              <p className="mt-3 text-sm text-ink-500">
                {assignment.subject} · set by {assignment.teacher} · due{' '}
                {formatDate(assignment.dueDate)} · out of {assignment.maxMarks}
              </p>

              {assignment.status === 'graded' && (
                <div className="mt-4 border-l-2 border-brand-400 bg-white px-4 py-3">
                  <p className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-serif text-2xl text-ink-900">
                      {assignment.marks}
                      <span className="text-base text-ink-500">/{assignment.maxMarks}</span>
                    </span>
                    {assignment.marks !== null && (
                      <span className="text-sm text-ink-500">
                        {Math.round((assignment.marks / assignment.maxMarks) * 100)}%
                      </span>
                    )}
                  </p>
                  {assignment.feedback && (
                    <p className="prose-measure mt-2 text-sm text-ink-700">{assignment.feedback}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-10 text-sm text-ink-500">
        Submission is handled in class or through your subject teacher — this page records what has
        been received and graded. Assignment marks are separate from the internal marks on your
        marks page.
      </p>
    </>
  );
}
