const LOCALE = 'en-IN';

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Split form for the date chip on event cards. */
export function dateParts(iso: string) {
  const date = new Date(iso);
  return {
    day: date.toLocaleDateString(LOCALE, { day: '2-digit' }),
    month: date.toLocaleDateString(LOCALE, { month: 'short' }).toUpperCase(),
  };
}
