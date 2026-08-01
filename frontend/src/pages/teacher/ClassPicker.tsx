import { useMemo } from 'react';

import type { TeacherClass } from '@/types';

const FIELD =
  'w-full border-b border-ink-300 bg-transparent py-2.5 text-ink-900 transition focus:border-brand-600';

export interface ClassSelection {
  subjectId: string;
  section: string;
}

interface ClassPickerProps {
  classes: TeacherClass[];
  value: ClassSelection;
  onChange: (next: ClassSelection) => void;
  /** Rendered in the third column — a date input on the attendance page. */
  children?: React.ReactNode;
}

/**
 * Subject and section selectors, driven entirely by the teacher's assignments.
 *
 * The options *are* the authorisation model: a class the teacher does not own
 * never appears here, and the server checks the pair again on every write.
 */
export function ClassPicker({ classes, value, onChange, children }: ClassPickerProps) {
  const subjects = useMemo(() => {
    const seen = new Map<string, TeacherClass>();
    for (const entry of classes) if (!seen.has(entry.subjectId)) seen.set(entry.subjectId, entry);
    return [...seen.values()];
  }, [classes]);

  const sections = useMemo(
    () =>
      classes
        .filter((entry) => entry.subjectId === value.subjectId)
        .map((entry) => entry.section)
        .sort(),
    [classes, value.subjectId],
  );

  function pickSubject(subjectId: string) {
    const available = classes
      .filter((entry) => entry.subjectId === subjectId)
      .map((entry) => entry.section)
      .sort();

    // Keep the section if this subject also has it; otherwise fall to the first.
    const section = available.includes(value.section) ? value.section : (available[0] ?? '');
    onChange({ subjectId, section });
  }

  return (
    <div className="grid gap-6 border-b border-ink-300 pb-6 sm:grid-cols-2 lg:grid-cols-4">
      <div className="lg:col-span-2">
        <label htmlFor="class-subject" className="kicker block text-ink-500">
          Subject
        </label>
        <select
          id="class-subject"
          value={value.subjectId}
          onChange={(event) => pickSubject(event.target.value)}
          className={FIELD}
        >
          {subjects.map((entry) => (
            <option key={entry.subjectId} value={entry.subjectId}>
              {entry.code} — {entry.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="class-section" className="kicker block text-ink-500">
          Section
        </label>
        <select
          id="class-section"
          value={value.section}
          onChange={(event) => onChange({ ...value, section: event.target.value })}
          className={FIELD}
        >
          {sections.map((section) => (
            <option key={section} value={section}>
              Section {section}
            </option>
          ))}
        </select>
      </div>

      {children}
    </div>
  );
}
