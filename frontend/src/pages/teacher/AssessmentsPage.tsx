import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError, api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { ADAPTABILITY_CRITERIA, ADAPTABILITY_RATINGS } from '@/lib/oaaCriteria';
import { useApi } from '@/lib/useApi';
import type { AssessableStudent } from '@/types';

const SOCIAL_ACTIVITIES = [
  { value: 'event', label: 'Event participation' },
  { value: 'volunteering', label: 'Volunteering' },
  { value: 'club', label: 'Club involvement' },
  { value: 'mentoring', label: 'Mentoring' },
  { value: 'outreach', label: 'Community outreach' },
] as const;

const FIELD =
  'w-full border-b border-ink-300 bg-transparent py-2.5 text-ink-900 transition placeholder:text-ink-400 focus:border-brand-600';

type Scores = Record<string, number>;

const blankScores = (): Scores =>
  Object.fromEntries(ADAPTABILITY_CRITERIA.map((criterion) => [criterion.key, 3]));

export default function TeacherAssessmentsPage() {
  const [semester, setSemester] = useState(5);
  const path = `/api/teachers/assessments?semester=${semester}`;
  const { data, error, loading, reload } = useApi<AssessableStudent[]>(path);

  const [openId, setOpenId] = useState<string | null>(null);

  /**
   * The confirmation lives here, not in the form that produced it. Saving
   * refetches the list, and `useApi` blanks `data` while it does — which unmounts
   * every row and takes any state inside them with it. Held at page level, the
   * message survives the round trip.
   */
  const [notice, setNotice] = useState<string | null>(null);

  function handleSaved(message: string) {
    setNotice(message);
    reload();
  }

  return (
    <>
      <PageHeader
        title="Assessments"
        description="Adaptability ratings and social contribution records — the two OAA dimensions only a teacher can supply."
      />

      <div className="mb-8 flex flex-wrap items-end gap-6 border-b border-ink-300 pb-6">
        <div className="w-40">
          <label htmlFor="assessment-semester" className="kicker block text-ink-500">
            Semester
          </label>
          <select
            id="assessment-semester"
            value={semester}
            onChange={(event) => {
              setSemester(Number(event.target.value));
              setOpenId(null);
            }}
            className={FIELD}
          >
            {[3, 4, 5].map((value) => (
              <option key={value} value={value}>
                Semester {value}
              </option>
            ))}
          </select>
        </div>
        <p className="max-w-xl text-sm text-ink-500">
          Rating a student recalculates their OAA immediately. Re-rating replaces your own previous
          assessment rather than adding a second one, so a correction never double-counts.
        </p>
      </div>

      {notice && (
        <p
          role="status"
          className="mb-6 border-l-2 border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-800"
        >
          {notice}
        </p>
      )}

      {loading && <Loading variant="page" label="Loading your students…" />}
      {error && <ErrorMessage message={error} onRetry={reload} />}

      {!loading && !error && data && data.length === 0 && (
        <EmptyState
          title="No students to assess"
          description="Assessments open once an administrator assigns you a class."
        />
      )}

      {data && data.length > 0 && (
        <ul className="border-t border-ink-300">
          {data.map((student) => (
            <StudentRow
              key={student.studentId}
              student={student}
              semester={semester}
              open={openId === student.studentId}
              onToggle={() =>
                setOpenId((current) => (current === student.studentId ? null : student.studentId))
              }
              onSaved={handleSaved}
            />
          ))}
        </ul>
      )}
    </>
  );
}

interface StudentRowProps {
  student: AssessableStudent;
  semester: number;
  open: boolean;
  onToggle: () => void;
  onSaved: (message: string) => void;
}

function StudentRow({ student, semester, open, onToggle, onSaved }: StudentRowProps) {
  const rated = student.scores !== null;

  const mean = useMemo(() => {
    if (!student.scores) return null;
    const values = ADAPTABILITY_CRITERIA.map((criterion) => student.scores?.[criterion.key] ?? 0);
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  }, [student.scores]);

  return (
    <li className="border-b border-ink-200">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-1 py-4 text-left transition hover:bg-white"
      >
        <span className="text-ink-900">
          <span className="font-mono text-sm text-ink-600">{student.rollNo}</span>
          <span className="ml-3">{student.name}</span>
          <span className="ml-3 text-sm text-ink-500">Section {student.section}</span>
        </span>

        <span className="flex items-center gap-5 text-sm">
          <span className={cn(rated ? 'text-ink-700' : 'text-ink-400')}>
            {rated ? `Adaptability ${mean}/5` : 'Not yet rated'}
          </span>
          <span className="tabular-nums text-ink-500">{student.socialPoints} social pts</span>
          <span aria-hidden="true" className="kicker text-brand-700">
            {open ? 'Close' : 'Open'}
          </span>
        </span>
      </button>

      {open && (
        <div className="grid gap-x-12 gap-y-8 border-t border-ink-200 bg-white px-5 py-6 lg:grid-cols-2">
          <AdaptabilityForm student={student} semester={semester} onSaved={onSaved} />
          <SocialForm student={student} semester={semester} onSaved={onSaved} />
        </div>
      )}
    </li>
  );
}

function AdaptabilityForm({
  student,
  semester,
  onSaved,
}: {
  student: AssessableStudent;
  semester: number;
  onSaved: (message: string) => void;
}) {
  const [scores, setScores] = useState<Scores>(() => ({ ...blankScores(), ...student.scores }));
  const [note, setNote] = useState(student.note);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setFailure(null);

    try {
      await api.post('/api/teachers/assessments/adaptability', {
        studentId: student.studentId,
        semester,
        scores,
        note,
      });
      // Reported upward: saving refetches the list, which unmounts this form.
      onSaved(`Saved — ${student.name}'s OAA has been recalculated.`);
    } catch (err) {
      setFailure(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not save this assessment.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h3 className="font-serif text-lg text-ink-900">Adaptability</h3>
      <p className="mt-1 text-sm text-ink-500">
        All seven are rated together — a partial rating would average against criteria you never
        considered.
      </p>

      <div className="mt-5 space-y-4">
        {ADAPTABILITY_CRITERIA.map((criterion) => (
          <div key={criterion.key} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-ink-900">{criterion.label}</p>
              <p className="text-xs text-ink-500">{criterion.hint}</p>
            </div>

            <fieldset className="flex shrink-0">
              <legend className="sr-only">{criterion.label}</legend>
              {ADAPTABILITY_RATINGS.map((rating) => (
                <label
                  key={rating}
                  className={cn(
                    'kicker cursor-pointer border px-2.5 py-1.5 transition not-first:border-l-0',
                    scores[criterion.key] === rating
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-ink-300 bg-white text-ink-500 hover:border-ink-400 hover:text-ink-800',
                  )}
                >
                  <input
                    type="radio"
                    name={`${student.studentId}-${criterion.key}`}
                    className="sr-only"
                    aria-label={`${criterion.label}: ${rating} of 5`}
                    checked={scores[criterion.key] === rating}
                    onChange={() =>
                      setScores((previous) => ({ ...previous, [criterion.key]: rating }))
                    }
                  />
                  {rating}
                </label>
              ))}
            </fieldset>
          </div>
        ))}
      </div>

      <label htmlFor={`note-${student.studentId}`} className="kicker mt-6 block text-ink-500">
        Note (optional)
      </label>
      <textarea
        id={`note-${student.studentId}`}
        value={note}
        rows={2}
        maxLength={500}
        onChange={(event) => setNote(event.target.value)}
        placeholder="What did you observe?"
        className="w-full border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 transition focus:border-brand-600"
      />

      {failure && <ErrorMessage message={failure} className="mt-4" />}

      <Button onClick={save} disabled={saving} className="mt-5">
        {saving ? 'Saving…' : student.scores ? 'Update rating' : 'Save rating'}
      </Button>
    </section>
  );
}

function SocialForm({
  student,
  semester,
  onSaved,
}: {
  student: AssessableStudent;
  semester: number;
  onSaved: (message: string) => void;
}) {
  const [activity, setActivity] = useState<string>('event');
  const [label, setLabel] = useState('');
  const [points, setPoints] = useState('5');
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const parsedPoints = /^\d+$/.test(points.trim()) ? Number(points) : null;
  const invalid = parsedPoints === null || parsedPoints < 1 || parsedPoints > 25;

  async function save() {
    if (invalid || !label.trim()) return;

    setSaving(true);
    setFailure(null);

    try {
      await api.post('/api/teachers/records/social', {
        studentId: student.studentId,
        semester,
        activity,
        label: label.trim(),
        points: parsedPoints,
      });
      setLabel('');
      onSaved(`Added — ${student.name}'s OAA has been recalculated.`);
    } catch (err) {
      setFailure(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not add this record.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h3 className="font-serif text-lg text-ink-900">Social contribution</h3>
      <p className="mt-1 text-sm text-ink-500">
        Each record adds points, capped at the full-credit total. {student.socialPoints} recorded so
        far this semester.
      </p>

      {student.socialRecords.length > 0 && (
        <ul className="mt-4">
          {student.socialRecords.map((record) => (
            <li
              key={record.id}
              className="flex items-baseline justify-between gap-4 border-t border-ink-200 py-2.5 text-sm"
            >
              <span className="text-ink-900">{record.label}</span>
              <span className="shrink-0 tabular-nums text-ink-600">+{record.points}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor={`social-label-${student.studentId}`}
            className="kicker block text-ink-500"
          >
            What they did
          </label>
          <input
            id={`social-label-${student.studentId}`}
            value={label}
            maxLength={120}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ran the registration desk at Prayaan"
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor={`social-type-${student.studentId}`} className="kicker block text-ink-500">
            Type
          </label>
          <select
            id={`social-type-${student.studentId}`}
            value={activity}
            onChange={(event) => setActivity(event.target.value)}
            className={FIELD}
          >
            {SOCIAL_ACTIVITIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`social-points-${student.studentId}`}
            className="kicker block text-ink-500"
          >
            Points (1–25)
          </label>
          <input
            id={`social-points-${student.studentId}`}
            value={points}
            inputMode="numeric"
            aria-invalid={invalid}
            onChange={(event) => setPoints(event.target.value)}
            className={cn(FIELD, invalid && 'border-red-500 text-red-800')}
          />
        </div>
      </div>

      {failure && <ErrorMessage message={failure} className="mt-4" />}

      <Button
        variant="secondary"
        onClick={save}
        disabled={saving || invalid || label.trim().length === 0}
        className="mt-5"
      >
        {saving ? 'Adding…' : 'Add record'}
      </Button>
    </section>
  );
}
