import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import type { AttendanceSummary, MarksSummary, StudentProfile } from '@/types';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-t border-ink-200 py-3">
      <dt className="kicker text-ink-500">{label}</dt>
      <dd className="mt-1.5 text-ink-900">{value}</dd>
    </div>
  );
}

/**
 * The staff view of one student: the same records the student sees, read through
 * the same endpoints. Nothing here is editable — corrections are made on the
 * attendance and marks pages, where the class ownership check applies.
 */
export default function TeacherStudentDetailPage() {
  const { studentId = '' } = useParams();

  const profile = useApi<StudentProfile>(`/api/students/${studentId}`);
  const marks = useApi<MarksSummary>(`/api/students/${studentId}/marks`);
  const attendance = useApi<AttendanceSummary>(`/api/students/${studentId}/attendance`);

  if (profile.loading) return <Loading variant="page" label="Loading the student record…" />;

  if (profile.error) {
    return (
      <>
        <Back />
        <ErrorMessage message={profile.error} onRetry={profile.reload} />
      </>
    );
  }

  if (!profile.data) {
    return (
      <>
        <Back />
        <EmptyState title="Student not found" description="No record exists for that id." />
      </>
    );
  }

  const student = profile.data;
  const current = marks.data?.semesters.find((semester) => semester.semester === student.semester);

  return (
    <>
      <Back />

      <PageHeader
        title={student.name}
        description={`${student.rollNo} · ${student.department} · Semester ${student.semester}, section ${student.section}`}
      />

      <div className="mb-10 flex flex-wrap items-center gap-5 border border-ink-300 bg-white p-6">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center border border-brand-200 bg-brand-50 font-serif text-xl text-brand-700"
        >
          {initials(student.name)}
        </span>

        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <p className="kicker text-ink-500">CGPA</p>
            <p className="mt-1.5 font-serif text-2xl text-ink-900">
              {marks.data?.cgpa != null ? marks.data.cgpa.toFixed(2) : '—'}
            </p>
          </div>
          <div>
            <p className="kicker text-ink-500">Attendance</p>
            <p
              className={cn(
                'mt-1.5 font-serif text-2xl',
                attendance.data?.belowThreshold ? 'text-red-700' : 'text-ink-900',
              )}
            >
              {attendance.data ? `${attendance.data.overall.percentage}%` : '—'}
            </p>
          </div>
          <div>
            <p className="kicker text-ink-500">Classes attended</p>
            <p className="mt-1.5 font-serif text-2xl text-ink-900">
              {attendance.data
                ? `${attendance.data.overall.attended}/${attendance.data.overall.held}`
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {attendance.data?.belowThreshold && (
        <div
          role="alert"
          className="mb-10 border-l-2 border-red-500 bg-red-50/70 px-4 py-3.5 text-red-800"
        >
          <p className="kicker">Below the {attendance.data.threshold}% requirement</p>
          <p className="mt-1.5 text-sm text-red-700">
            {student.name} is at {attendance.data.overall.percentage}% overall and is not currently
            eligible to sit this semester's examinations.
          </p>
        </div>
      )}

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
        <section>
          <h2 className="font-serif text-xl text-ink-900">Record</h2>
          <dl className="mt-4">
            <Field label="Roll number" value={student.rollNo} />
            <Field label="Email" value={student.email} />
            <Field label="Phone" value={student.phone} />
            <Field label="Guardian" value={`${student.guardianName} · ${student.guardianPhone}`} />
            <Field label="Admission year" value={student.admissionYear} />
          </dl>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900">Attendance by subject</h2>
          {attendance.error && <ErrorMessage message={attendance.error} className="mt-4" />}
          {attendance.data && attendance.data.subjects.length === 0 && (
            <p className="mt-4 text-sm text-ink-500">No classes recorded yet.</p>
          )}
          <ul className="mt-4">
            {attendance.data?.subjects.map((subject) => (
              <li
                key={subject.subjectId}
                className="flex items-baseline justify-between gap-4 border-t border-ink-200 py-3 text-sm"
              >
                <span className="text-ink-900">
                  <span className="font-mono text-ink-600">{subject.code}</span>
                  <span className="ml-3">{subject.name}</span>
                </span>
                <span
                  className={cn(
                    'tabular-nums',
                    subject.belowThreshold ? 'text-red-700' : 'text-ink-700',
                  )}
                >
                  {subject.percentage}%{' '}
                  <span className="text-ink-400">
                    ({subject.attended}/{subject.held})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink-300 pb-3">
          <h2 className="font-serif text-xl text-ink-900">Marks — semester {student.semester}</h2>
          {current?.sgpa != null && (
            <p className="text-sm text-ink-600">
              {current.credits} credits ·{' '}
              <span className="text-ink-900">SGPA {current.sgpa.toFixed(2)}</span>
            </p>
          )}
        </div>

        {marks.error && <ErrorMessage message={marks.error} className="mt-4" />}

        {marks.data && !current && (
          <p className="mt-4 text-sm text-ink-500">
            No marks recorded for the current semester yet.
          </p>
        )}

        {current && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="kicker text-ink-500">
                  <th scope="col" className="py-3 pr-4 text-left font-medium">
                    Code
                  </th>
                  <th scope="col" className="py-3 pr-4 text-left font-medium">
                    Subject
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
                {current.subjects.map((subject) => (
                  <tr key={subject.subjectId} className="border-t border-ink-200">
                    <td className="py-3 pr-4 font-mono text-ink-600">{subject.code}</td>
                    <td className="py-3 pr-4 text-ink-900">{subject.name}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-ink-700">
                      {subject.internal}/{subject.internalMax}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-ink-700">
                      {subject.external}/{subject.externalMax}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-ink-900">
                      {subject.total}
                    </td>
                    <td
                      className={cn(
                        'py-3 text-right font-mono',
                        subject.grade === 'F' ? 'text-red-700' : 'text-ink-900',
                      )}
                    >
                      {subject.grade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Back() {
  return (
    <Link
      to="/teacher/students"
      className="kicker mb-6 inline-block text-ink-500 transition hover:text-ink-900"
    >
      ← All students
    </Link>
  );
}
