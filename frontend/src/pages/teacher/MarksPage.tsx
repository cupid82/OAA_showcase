import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError, api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';
import type { ClassMarks, MarksGridRow } from '@/types';

import { ClassPicker } from './ClassPicker';
import { useClassSelection } from './useClassSelection';

/** What is in the inputs. Strings, because an emptied field is not zero. */
interface Draft {
  internal: string;
  external: string;
}

const toDraft = (row: MarksGridRow): Draft => ({
  internal: row.internal === null ? '' : String(row.internal),
  external: row.external === null ? '' : String(row.external),
});

const isDirty = (draft: Draft, row: MarksGridRow) =>
  draft.internal !== toDraft(row).internal || draft.external !== toDraft(row).external;

/**
 * Reads one cell. Returns `null` for anything that is not a whole number in
 * range — the caller turns that into a message rather than sending it.
 */
function parseCell(value: string, max: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return parsed > max ? null : parsed;
}

export default function TeacherMarksPage() {
  const { classes, selection, select, error, loading } = useClassSelection();

  const path =
    selection.subjectId && selection.section
      ? `/api/marks?subjectId=${encodeURIComponent(selection.subjectId)}&section=${encodeURIComponent(selection.section)}`
      : '';

  return (
    <>
      <PageHeader
        title="Marks entry"
        description="Internal and external marks for one class. Totals and grades are derived, never typed."
      />

      {loading && <Loading variant="page" label="Loading your classes…" />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && classes.length === 0 && (
        <EmptyState
          title="No classes assigned to you"
          description="Marks entry opens once an administrator assigns you a subject and section."
        />
      )}

      {classes.length > 0 && (
        <>
          <ClassPicker classes={classes} value={selection} onChange={select} />
          {path && <MarksGrid key={path} path={path} />}
        </>
      )}
    </>
  );
}

function MarksGrid({ path }: { path: string }) {
  const { data, error, loading, reload } = useApi<ClassMarks>(path);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Notice and error survive on purpose — this effect reruns after a save reloads
  // the grid, and clearing them would wipe the confirmation the teacher is meant
  // to read. Changing class remounts the component, which resets them.
  useEffect(() => {
    if (!data) return;
    setDrafts(Object.fromEntries(data.rows.map((row) => [row.studentId, toDraft(row)])));
  }, [data]);

  const dirtyRows = useMemo(
    () => data?.rows.filter((row) => isDirty(drafts[row.studentId] ?? toDraft(row), row)) ?? [],
    [data, drafts],
  );

  if (loading) return <Loading label="Loading the class…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} className="mt-8" />;
  if (!data) return null;

  if (data.rows.length === 0) {
    return (
      <EmptyState
        className="mt-8"
        title="No students in this class"
        description={`No student is currently enrolled in ${data.subject.code} section ${data.section}.`}
      />
    );
  }

  const { internalMax, externalMax } = data.subject;
  const totalMax = internalMax + externalMax;

  function cellError(row: MarksGridRow): string | null {
    const draft = drafts[row.studentId] ?? toDraft(row);
    if (draft.internal === '' && draft.external === '') return null;

    if (draft.internal === '' || draft.external === '') {
      return 'Enter both internal and external marks.';
    }
    if (parseCell(draft.internal, internalMax) === null) {
      return `Internal must be a whole number from 0 to ${internalMax}.`;
    }
    if (parseCell(draft.external, externalMax) === null) {
      return `External must be a whole number from 0 to ${externalMax}.`;
    }
    return null;
  }

  const blocked = dirtyRows.some((row) => cellError(row) !== null);

  async function saveAll() {
    if (!data) return;

    setSaving(true);
    setSaveError(null);
    setNotice(null);

    try {
      // Sequential, not parallel: each write persists the whole JSON document, so
      // overlapping writes would race on the same file.
      for (const row of dirtyRows) {
        const draft = drafts[row.studentId];
        if (!draft) continue;

        const internal = parseCell(draft.internal, internalMax);
        const external = parseCell(draft.external, externalMax);
        if (internal === null || external === null) continue;

        if (row.markId) {
          await api.patch(`/api/marks/${row.markId}`, { internal, external });
        } else {
          await api.post('/api/marks', {
            studentId: row.studentId,
            subjectId: data.subject.id,
            internal,
            external,
          });
        }
      }

      setNotice(`Saved ${dirtyRows.length} ${dirtyRows.length === 1 ? 'student' : 'students'}.`);
      reload();
    } catch (err) {
      setSaveError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not save these marks.',
      );
      // Whatever landed before the failure is real — show the stored state.
      reload();
    } finally {
      setSaving(false);
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
            {data.subject.name} · Semester {data.subject.semester} · {data.subject.credits} credits
            · internal out of {internalMax}, external out of {externalMax}
          </p>
        </div>
        <span className="text-sm text-ink-600 tabular-nums">
          {dirtyRows.length === 0 ? 'No unsaved changes' : `${dirtyRows.length} unsaved`}
        </span>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-5 border-l-2 border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-800"
        >
          {notice}
        </p>
      )}

      {saveError && <ErrorMessage message={saveError} className="mt-5" />}

      <div className="mt-6 overflow-x-auto border border-ink-300 bg-white">
        <table className="w-full min-w-[44rem] text-left">
          <thead>
            <tr className="border-b border-ink-300">
              <th scope="col" className="kicker px-4 py-3 text-ink-500">
                Roll no
              </th>
              <th scope="col" className="kicker px-4 py-3 text-ink-500">
                Name
              </th>
              <th scope="col" className="kicker px-4 py-3 text-ink-500">
                Internal /{internalMax}
              </th>
              <th scope="col" className="kicker px-4 py-3 text-ink-500">
                External /{externalMax}
              </th>
              <th scope="col" className="kicker px-4 py-3 text-right text-ink-500">
                Total /{totalMax}
              </th>
              <th scope="col" className="kicker px-4 py-3 text-right text-ink-500">
                Grade
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => {
              const draft = drafts[row.studentId] ?? toDraft(row);
              const message = cellError(row);
              const internal = parseCell(draft.internal, internalMax);
              const external = parseCell(draft.external, externalMax);
              const total = internal !== null && external !== null ? internal + external : null;

              return (
                <tr key={row.studentId} className="border-b border-ink-200 last:border-b-0">
                  <td className="px-4 py-3 font-mono text-sm text-ink-700">{row.rollNo}</td>
                  <td className="px-4 py-3 text-ink-900">
                    {row.name}
                    {message && (
                      <span className="mt-1 block text-xs text-red-700" role="alert">
                        {message}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <MarkInput
                      label={`Internal marks for ${row.rollNo}`}
                      value={draft.internal}
                      max={internalMax}
                      invalid={message !== null && parseCell(draft.internal, internalMax) === null}
                      onChange={(value) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.studentId]: { ...draft, internal: value },
                        }))
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <MarkInput
                      label={`External marks for ${row.rollNo}`}
                      value={draft.external}
                      max={externalMax}
                      invalid={message !== null && parseCell(draft.external, externalMax) === null}
                      onChange={(value) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.studentId]: { ...draft, external: value },
                        }))
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-900">{total ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {/* The saved grade. It only moves once the change is stored. */}
                    <span
                      className={cn(
                        'font-mono text-sm',
                        isDirty(draft, row) ? 'text-ink-400' : 'text-ink-900',
                      )}
                    >
                      {row.grade ?? '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button onClick={saveAll} disabled={saving || dirtyRows.length === 0 || blocked}>
          {saving
            ? 'Saving…'
            : `Save ${dirtyRows.length || ''} ${dirtyRows.length === 1 ? 'change' : 'changes'}`.trim()}
        </Button>
        {dirtyRows.length > 0 && (
          <Button
            variant="secondary"
            onClick={() =>
              setDrafts(Object.fromEntries(data.rows.map((row) => [row.studentId, toDraft(row)])))
            }
            disabled={saving}
          >
            Discard
          </Button>
        )}
        <p className="text-sm text-ink-500">
          Marks above the subject maximum are rejected by the server as well as here. Grades and
          SGPA are calculated from these numbers on read — they are never stored.
        </p>
      </div>
    </section>
  );
}

interface MarkInputProps {
  label: string;
  value: string;
  max: number;
  invalid: boolean;
  onChange: (value: string) => void;
}

function MarkInput({ label, value, max, invalid, onChange }: MarkInputProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      aria-invalid={invalid}
      value={value}
      placeholder="—"
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'w-20 border px-2 py-1.5 text-right tabular-nums transition',
        invalid
          ? 'border-red-500 bg-red-50 text-red-800'
          : 'border-ink-300 bg-white text-ink-900 focus:border-brand-600',
      )}
      title={`0 to ${max}`}
    />
  );
}
