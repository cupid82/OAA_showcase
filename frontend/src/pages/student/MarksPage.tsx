import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import type { MarksSummary, SemesterMarks } from '@/types';

/** Failing grades are the one thing that should catch the eye in a dense table. */
const isFail = (grade: string) => grade === 'F';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-t-2 border-brand-400 bg-white px-5 py-4">
      <p className="kicker text-ink-500">{label}</p>
      <p className="mt-2 font-serif text-3xl text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
    </div>
  );
}

function SemesterTable({ semester, isCurrent }: { semester: SemesterMarks; isCurrent: boolean }) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink-300 pb-3">
        <h2 className="font-serif text-xl text-ink-900">
          Semester {semester.semester}
          {isCurrent && (
            <span className="kicker ml-3 border border-brand-200 bg-brand-50 px-2 py-1 text-brand-700">
              Current
            </span>
          )}
        </h2>
        <p className="text-sm text-ink-600">
          {semester.credits} credits
          {semester.sgpa !== null && (
            <>
              {' · '}
              <span className="text-ink-900">SGPA {semester.sgpa.toFixed(2)}</span>
            </>
          )}
        </p>
      </div>

      {/* The table is wider than a phone — it scrolls inside this box, not the page. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="kicker text-ink-500">
              <th scope="col" className="py-3 pr-4 text-left font-medium">
                Code
              </th>
              <th scope="col" className="py-3 pr-4 text-left font-medium">
                Subject
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">
                Credits
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">
                Internal
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">
                External
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">
                Total
              </th>
              <th scope="col" className="py-3 text-right font-medium">
                Grade
              </th>
            </tr>
          </thead>
          <tbody>
            {semester.subjects.map((subject) => (
              <tr key={subject.subjectId} className="border-t border-ink-200">
                <td className="py-3 pr-4 font-mono text-ink-600">{subject.code}</td>
                <td className="py-3 pr-4 text-ink-900">{subject.name}</td>
                <td className="py-3 pr-4 text-right tabular-nums text-ink-600">
                  {subject.credits}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-ink-700">
                  {subject.internal}
                  <span className="text-ink-400"> / {subject.internalMax}</span>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-ink-700">
                  {subject.external}
                  <span className="text-ink-400"> / {subject.externalMax}</span>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums font-medium text-ink-900">
                  {subject.total}
                  <span className="font-normal text-ink-400"> / {subject.totalMax}</span>
                </td>
                <td className="py-3 text-right">
                  <span
                    className={cn(
                      'inline-block min-w-9 border px-2 py-1 text-center font-mono text-xs',
                      isFail(subject.grade)
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-ink-300 bg-ink-50 text-ink-800',
                    )}
                  >
                    {subject.grade}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function MarksPage() {
  const { data, error, loading, reload } = useApi<MarksSummary>('/api/students/me/marks');

  if (loading) return <Loading variant="page" label="Loading your marks…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  if (!data || data.semesters.length === 0) {
    return (
      <>
        <PageHeader title="Marks" description="Subject-wise internal and external marks." />
        <EmptyState
          title="No marks published yet"
          description="Marks appear here once your teachers have entered and published them."
        />
      </>
    );
  }

  const totalCredits = data.semesters.reduce((sum, semester) => sum + semester.credits, 0);
  const subjectCount = data.semesters.reduce((sum, semester) => sum + semester.subjects.length, 0);

  return (
    <>
      <PageHeader
        title="Marks"
        description="Subject-wise internal and external marks, grouped by semester."
      />

      <div className="grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-3">
        <Stat
          label="CGPA"
          value={data.cgpa === null ? '—' : data.cgpa.toFixed(2)}
          hint="Credit-weighted, all semesters"
        />
        <Stat label="Credits" value={String(totalCredits)} hint={`${subjectCount} subjects`} />
        <Stat
          label="Current semester"
          value={String(data.currentSemester)}
          hint={`${data.semesters.length} semesters on record`}
        />
      </div>

      {data.semesters.map((semester) => (
        <SemesterTable
          key={semester.semester}
          semester={semester}
          isCurrent={semester.semester === data.currentSemester}
        />
      ))}

      <p className="mt-10 border-t border-ink-300 pt-5 text-sm text-ink-500">
        Totals, grades, SGPA and CGPA are calculated from the marks above — they are not stored
        separately, so they always match what you see here.
      </p>
    </>
  );
}
