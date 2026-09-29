/**
 * Dates and small numbers, formatted the same way everywhere, without a date
 * library.
 *
 * "Today" is the **UTC** date on purpose: the server validates dates in UTC, and a
 * practice log dated by the browser's local calendar would be "in the future" to
 * the server for the first few hours of every Indian morning.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parts(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return { year: year ?? 0, month: month ?? 1, day: day ?? 1 };
}

/** `2026-10-03` → `3 Oct 2026` (the year is dropped when it is this year). */
export function formatDate(iso: string, withYear?: boolean): string {
  const { year, month, day } = parts(iso);
  const showYear = withYear ?? year !== Number(todayISO().slice(0, 4));
  return `${day} ${MONTHS[month - 1] ?? ''}${showYear ? ` ${year}` : ''}`;
}

/** `2026-10-03` → `Sat 3 Oct`. */
export function formatDay(iso: string): string {
  const { year, month, day } = parts(iso);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? '';
  return `${weekday} ${day} ${MONTHS[month - 1] ?? ''}`;
}

/** `2026-10` style month name. */
export function monthName(month: number): string {
  return MONTHS_LONG[month - 1] ?? '';
}

/** `2026-10-03` → `{ day: 3, month: 'OCT' }`, for a date plate. */
export function plateParts(iso: string): { day: number; month: string } {
  const { month, day } = parts(iso);
  return { day, month: (MONTHS[month - 1] ?? '').toUpperCase() };
}

/** `YYYY-MM-DD` plus `days`, in UTC. */
export function addDaysISO(iso: string, days: number): string {
  return new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Whole days from today (UTC) to `iso`. Negative in the past. */
export function daysUntil(iso: string): number {
  const today = Date.parse(`${todayISO()}T00:00:00Z`);
  const then = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Math.round((then - today) / 86_400_000);
}

/** 0 → "today", 1 → "tomorrow", 5 → "in 5 days", −2 → "2 days ago". */
export function relativeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** An instant, relative to now: "just now", "5 min ago", "3 h ago", "2 d ago". */
export function timeAgo(isoInstant: string): string {
  const seconds = Math.max(0, (Date.now() - Date.parse(isoInstant)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 86_400 * 14) return `${Math.floor(seconds / 86_400)} d ago`;
  return formatDate(isoInstant);
}

/** 95 → "1 h 35 min", 30 → "30 min", 120 → "2 h". */
export function minutesLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function initialsOf(name: string): string {
  return name
    .replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "React, Node.js and SQL". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const ORDINALS = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth'];
export const yearLabel = (year: number) => `${ORDINALS[year] ?? `Year ${year}`} year`;
