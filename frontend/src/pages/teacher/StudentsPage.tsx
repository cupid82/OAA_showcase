import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { useApi } from '@/lib/useApi';
import type { TeacherClass, TeacherStudentResult } from '@/types';

const FIELD =
  'w-full border-b border-ink-300 bg-transparent py-2.5 text-ink-900 transition placeholder:text-ink-400 focus:border-brand-600';

export default function TeacherStudentsPage() {
  const [params, setParams] = useSearchParams();
  const { data: classes } = useApi<TeacherClass[]>('/api/teachers/me/classes');

  const [term, setTerm] = useState(() => params.get('q') ?? '');
  const subjectId = params.get('subject') ?? '';

  // Debounced, so typing a roll number is one request rather than seven.
  const [query, setQuery] = useState(term);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(term), 250);
    return () => clearTimeout(timer);
  }, [term]);

  const path = useMemo(() => {
    const search = new URLSearchParams();
    if (query.trim()) search.set('q', query.trim());
    if (subjectId) search.set('subjectId', subjectId);
    const suffix = search.toString();
    return suffix ? `/api/teachers/students?${suffix}` : '/api/teachers/students';
  }, [query, subjectId]);

  const { data, error, loading, reload } = useApi<TeacherStudentResult[]>(path);

  const subjects = useMemo(() => {
    const seen = new Map<string, TeacherClass>();
    for (const entry of classes ?? [])
      if (!seen.has(entry.subjectId)) seen.set(entry.subjectId, entry);
    return [...seen.values()];
  }, [classes]);

  function setSubject(value: string) {
    const updated = new URLSearchParams(params);
    if (value) updated.set('subject', value);
    else updated.delete('subject');
    setParams(updated, { replace: true });
  }

  return (
    <>
      <PageHeader
        title="Students"
        description="Everyone in the classes assigned to you. Search by roll number or name."
      />

      <div className="grid gap-6 border-b border-ink-300 pb-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="student-search" className="kicker block text-ink-500">
            Search
          </label>
          <input
            id="student-search"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="22CS001 or Ananya"
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="student-subject" className="kicker block text-ink-500">
            Class
          </label>
          <select
            id="student-subject"
            value={subjectId}
            onChange={(event) => setSubject(event.target.value)}
            className={FIELD}
          >
            <option value="">All my classes</option>
            {subjects.map((entry) => (
              <option key={entry.subjectId} value={entry.subjectId}>
                {entry.code} — {entry.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <Loading label="Searching…" />}
      {error && <ErrorMessage message={error} onRetry={reload} className="mt-8" />}

      {!loading && !error && data && data.length === 0 && (
        <EmptyState
          className="mt-8"
          title="No students match"
          description={
            query.trim()
              ? `Nothing in your classes matches “${query.trim()}”.`
              : 'No students are enrolled in your classes yet.'
          }
        />
      )}

      {!loading && data && data.length > 0 && (
        <>
          <p className="mt-8 text-sm text-ink-500">
            {data.length} {data.length === 1 ? 'student' : 'students'}
          </p>

          <ul className="mt-3 border-t border-ink-300">
            {data.map((student) => (
              <li key={student.id} className="border-b border-ink-200">
                <Link
                  to={`/teacher/students/${student.id}`}
                  className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 transition hover:bg-white"
                >
                  <div className="min-w-0">
                    <p className="text-ink-900">
                      <span className="font-mono text-sm text-ink-600">{student.rollNo}</span>
                      <span className="ml-3">{student.name}</span>
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      Semester {student.semester} · Section {student.section} ·{' '}
                      {student.subjects.join(', ')}
                    </p>
                  </div>
                  <Icon
                    name="chevronRight"
                    className="size-4 text-ink-400 transition group-hover:text-brand-600"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
