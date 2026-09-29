/**
 * Calendar helpers. Every date in the store is an ISO string — `YYYY-MM-DD` for a
 * day, a full ISO timestamp for an instant — and all arithmetic is done in UTC so
 * that a date never shifts by one when the server's timezone changes.
 */

export const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` for an instant, in UTC. */
export function toISODate(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

function parse(iso: string): number {
  return Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  return toISODate(new Date(parse(iso) + days * DAY_MS));
}

/** Whole days from `from` to `to`. Positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to) - parse(from)) / DAY_MS);
}

/** Monday of the ISO week containing `iso`. Check-ins and practice group by it. */
export function weekStart(iso: string): string {
  const day = new Date(parse(iso)).getUTCDay(); // 0 = Sunday
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(iso, offset);
}

/** First day of the month containing `iso`. */
export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}
