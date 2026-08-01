import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useApi } from '@/lib/useApi';
import type { TeacherClass } from '@/types';

import type { ClassSelection } from './ClassPicker';

/**
 * Loads the teacher's classes and keeps the chosen one in the query string, so
 * a reload — or a link from the dashboard's "not yet marked" list — lands on the
 * same class rather than resetting to the first one.
 *
 * A subject or section in the URL that the teacher does not own is ignored, not
 * trusted: the selection always resolves to something in their own list.
 */
export function useClassSelection() {
  const [params, setParams] = useSearchParams();
  const { data, error, loading } = useApi<TeacherClass[]>('/api/teachers/me/classes');

  const classes = useMemo(() => data ?? [], [data]);

  const selection = useMemo<ClassSelection>(() => {
    const wantedSubject = params.get('subject');
    const subjectId = classes.some((entry) => entry.subjectId === wantedSubject)
      ? (wantedSubject as string)
      : (classes[0]?.subjectId ?? '');

    const sections = classes
      .filter((entry) => entry.subjectId === subjectId)
      .map((entry) => entry.section);

    const wantedSection = params.get('section');
    const section =
      wantedSection && sections.includes(wantedSection) ? wantedSection : (sections[0] ?? '');

    return { subjectId, section };
  }, [params, classes]);

  const select = useCallback(
    (next: ClassSelection) => {
      const updated = new URLSearchParams(params);
      updated.set('subject', next.subjectId);
      updated.set('section', next.section);
      setParams(updated, { replace: true });
    },
    [params, setParams],
  );

  const current = useMemo(
    () =>
      classes.find(
        (entry) => entry.subjectId === selection.subjectId && entry.section === selection.section,
      ) ?? null,
    [classes, selection],
  );

  return { classes, current, selection, select, error, loading };
}
