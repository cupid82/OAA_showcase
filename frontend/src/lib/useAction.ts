import { useCallback, useState } from 'react';

import { ApiError } from '@/lib/api';

/**
 * Turns an error into one readable sentence. A validation failure carries
 * per-field messages; the first of those is more useful than "Validation failed".
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const first = error.details ? Object.values(error.details).flat()[0] : undefined;
    return first ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

/**
 * Wraps a write — a save, a delete, a status change — with pending and error
 * state. `run` resolves to the result, or `undefined` if it failed (the error
 * is then in `error`), so callers never need their own try/catch.
 */
export function useAction<Args extends unknown[], R>(fn: (...args: Args) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: Args): Promise<R | undefined> => {
      setPending(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (caught) {
        setError(errorMessage(caught));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [fn],
  );

  return { run, pending, error, setError };
}
