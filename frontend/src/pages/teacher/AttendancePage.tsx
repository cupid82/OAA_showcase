import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError, api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import type { AttendanceStatus, ClassAttendance, RosterEntry } from '@/types';

import { ClassPicker } from './ClassPicker';
import { useClassSelection } from './useClassSelection';

const FIELD =
  'w-full border-b border-ink-300 bg-transparent py-2.5 text-ink-900 transition focus:border-brand-600';

/** Local `YYYY-MM-DD` — `toISOString()` would shift the date across a timezone. */
function todayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

const students = (count: number) => `${count} ${count === 1 ? 'student' : 'students'}`;

interface StatusToggleProps {
  value: AttendanceStatus;
  onChange: (next: AttendanceStatus) => void;
  disabled?: boolean;
  label: string;
}

/**
 * Two radios, styled as a segmented control. Deliberately not a checkbox: absent
 * and present are both explicit choices, and "unmarked" must not look like
 * "absent" — the difference decides whether a percentage is computed at all.
 */
function StatusToggle({ value, onChange, disabled, label }: StatusToggleProps) {
  return (
    <fieldset className="flex" disabled={disabled}>
      <legend className="sr-only">{label}</legend>
      {(['present', 'absent'] as const).map((status) => (
        <label
          key={status}
          className={cn(
            'kicker cursor-pointer border px-3 py-1.5 transition first:border-r-0',
            disabled && 'cursor-not-allowed opacity-60',
            value === status
              ? status === 'present'
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-red-500 bg-red-500 text-white'
              : 'border-ink-300 bg-white text-ink-500 hover:border-ink-400 hover:text-ink-800',
          )}
        >
          <input
            type="radio"
            name={`${label}-status`}
            aria-label={`${label} ${status}`}
            className="sr-only"
            checked={value === status}
            onChange={() => onChange(status)}
          />
          <span aria-hidden="true">{status === 'present' ? 'P' : 'A'}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default function TeacherAttendancePage() {
  const { classes, current, selection, select, error, loading } = useClassSelection();
  const [date, setDate] = useState(todayLocal);

  const query =
    selection.subjectId && selection.section
      ? `/api/attendance?subjectId=${encodeURIComponent(selection.subjectId)}&section=${encodeURIComponent(selection.section)}&date=${date}`
      : '';

  return (
    <>
      <PageHeader
        title="Mark attendance"
        description="Pick a class and a date, set each student, then submit the whole roster at once."
      />

      {loading && <Loading variant="page" label="Loading your classes…" />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && classes.length === 0 && (
        <EmptyState
          title="No classes assigned to you"
          description="Attendance entry opens once an administrator assigns you a subject and section."
        />
      )}

      {classes.length > 0 && (
        <>
          <ClassPicker classes={classes} value={selection} onChange={select}>
            <div>
              <label htmlFor="attendance-date" className="kicker block text-ink-500">
                Date
              </label>
              <input
                id="attendance-date"
                type="date"
                value={date}
                max={todayLocal()}
                onChange={(event) => setDate(event.target.value)}
                className={FIELD}
              />
            </div>
          </ClassPicker>

          {current && query && (
            <RosterEditor
              key={query}
              path={query}
              subjectId={selection.subjectId}
              section={selection.section}
              date={date}
            />
          )}
        </>
      )}
    </>
  );
}

interface RosterEditorProps {
  path: string;
  subjectId: string;
  section: string;
  date: string;
}

type Draft = Record<string, AttendanceStatus>;

function RosterEditor({ path, subjectId, section, date }: RosterEditorProps) {
  const { data, error, loading, reload } = useApi<ClassAttendance>(path);

  const [draft, setDraft] = useState<Draft>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Rows saved individually while editing an already-marked class. */
  const [savingRow, setSavingRow] = useState<string | null>(null);

  // Default an unmarked roster to everyone present — the common case, and the
  // teacher only has to correct the exceptions.
  //
  // Notices and errors are deliberately *not* cleared here: this effect also runs
  // after a save reloads the roster, and clearing them would delete the
  // confirmation (or the 409) the teacher is meant to read. Changing class or
  // date remounts the component, which is what resets them.
  useEffect(() => {
    if (!data) return;

    setDraft(
      Object.fromEntries(
        data.roster.map((entry) => [entry.studentId, entry.status ?? 'present']),
      ) as Draft,
    );
  }, [data]);

  const setStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    setDraft((previous) => ({ ...previous, [studentId]: status }));
  }, []);

  const presentCount = useMemo(
    () => Object.values(draft).filter((status) => status === 'present').length,
    [draft],
  );

  if (loading) return <Loading label="Loading the roster…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} className="mt-8" />;
  if (!data) return null;

  if (data.roster.length === 0) {
    return (
      <EmptyState
        className="mt-8"
        title="No students in this class"
        description={`No student is currently enrolled in ${data.subject.code} section ${data.section}.`}
      />
    );
  }

  const { alreadyMarked } = data;

  async function submitAll() {
    if (!data) return;

    setSubmitting(true);
    setSubmitError(null);
    setNotice(null);

    try {
      const { data: result } = await api.post<{ data: { created: number; date: string } }>(
        '/api/attendance/bulk',
        {
          subjectId,
          section,
          date,
          entries: data.roster.map((entry) => ({
            studentId: entry.studentId,
            status: draft[entry.studentId] ?? 'present',
          })),
        },
      );

      setNotice(`Saved ${students(result.created)} for ${formatDate(result.date)}.`);
      reload();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not save this attendance.',
      );
      // A 409 means someone marked this class first — show what is actually stored.
      if (err instanceof ApiError && err.status === 409) reload();
    } finally {
      setSubmitting(false);
    }
  }

  /** Editing an already-submitted class: one PATCH per row, audited server-side. */
  async function saveRow(entry: RosterEntry, status: AttendanceStatus) {
    if (!entry.attendanceId) return;

    setStatus(entry.studentId, status);
    setSavingRow(entry.studentId);
    setSubmitError(null);
    setNotice(null);

    try {
      await api.patch(`/api/attendance/${entry.attendanceId}`, { status });
      setNotice(`${entry.rollNo} updated to ${status}.`);
    } catch (err) {
      setStatus(entry.studentId, entry.status ?? 'present');
      setSubmitError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not save that change.',
      );
    } finally {
      setSavingRow(null);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-ink-900">
            {data.subject.code} · Section {data.section}
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            {data.subject.name} · {formatDate(data.date)} · {students(data.roster.length)}
          </p>
        </div>

        {!alreadyMarked && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-600 tabular-nums">
              {presentCount} present · {data.roster.length - presentCount} absent
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setDraft(
                  Object.fromEntries(
                    data.roster.map((entry) => [entry.studentId, 'present']),
                  ) as Draft,
                )
              }
            >
              Mark all present
            </Button>
          </div>
        )}
      </div>

      {alreadyMarked && (
        <p className="mt-5 border-l-2 border-accent-500 bg-accent-400/10 px-4 py-3 text-sm text-ink-700">
          This class was already marked for {formatDate(data.date)}. Changing a student below saves
          immediately and is recorded in the audit trail — attendance is never submitted twice for
          the same day.
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="mt-5 border-l-2 border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-800"
        >
          {notice}
        </p>
      )}

      {submitError && <ErrorMessage message={submitError} className="mt-5" />}

      <div className="mt-6 overflow-x-auto border border-ink-300 bg-white">
        <table className="w-full min-w-[34rem] text-left">
          <thead>
            <tr className="border-b border-ink-300">
              <th scope="col" className="kicker px-4 py-3 text-ink-500">
                Roll no
              </th>
              <th scope="col" className="kicker px-4 py-3 text-ink-500">
                Name
              </th>
              <th scope="col" className="kicker px-4 py-3 text-right text-ink-500">
                So far
              </th>
              <th scope="col" className="kicker px-4 py-3 text-right text-ink-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {data.roster.map((entry) => {
              const status = draft[entry.studentId] ?? 'present';

              return (
                <tr key={entry.studentId} className="border-b border-ink-200 last:border-b-0">
                  <td className="px-4 py-3 font-mono text-sm text-ink-700">{entry.rollNo}</td>
                  <td className="px-4 py-3 text-ink-900">{entry.name}</td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-ink-500">
                    {entry.held === 0 ? '—' : `${entry.percentage}%`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <StatusToggle
                        label={entry.rollNo}
                        value={status}
                        disabled={savingRow === entry.studentId}
                        onChange={(next) =>
                          alreadyMarked ? saveRow(entry, next) : setStatus(entry.studentId, next)
                        }
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!alreadyMarked && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button onClick={submitAll} disabled={submitting}>
            {submitting ? 'Saving…' : `Submit ${students(data.roster.length)}`}
          </Button>
          <p className="text-sm text-ink-500">
            One record per student, per subject, per day. Submitting the same class twice is
            rejected rather than counted twice.
          </p>
        </div>
      )}
    </section>
  );
}
