import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, api } from '@/lib/api';

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface UseApiResult<T> extends ApiState<T> {
  /** Refetch the same path. The current data stays on screen while it loads. */
  reload: () => void;
  /** Replace the data with a mutation's response — no refetch needed. */
  setData: (next: T) => void;
}

/**
 * Fetches one `{ data }` endpoint and tracks loading/error alongside it, so every
 * page renders the same three states without repeating the wiring.
 *
 * **Stale while revalidating.** A reload of the same path keeps the current data
 * on screen; only a *different* path starts blank. The old hook blanked `data`
 * on every refetch, which unmounted everything rendered under `{data && …}` —
 * including the "saved" notice the refetch was meant to confirm.
 *
 * Pass `null` to skip fetching (e.g. until a dependency is known).
 *
 * A 401 is handled globally in `lib/api.ts` (token cleared, redirect to /login),
 * so it never surfaces here.
 */
export function useApi<T>(path: string | null): UseApiResult<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    loading: path !== null,
  });
  const [attempt, setAttempt] = useState(0);
  const lastPath = useRef<string | null>(null);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  const setData = useCallback(
    (next: T) => setState({ data: next, error: null, loading: false }),
    [],
  );

  useEffect(() => {
    if (path === null) {
      setState({ data: null, error: null, loading: false });
      return;
    }

    let cancelled = false;
    const samePath = lastPath.current === path;
    lastPath.current = path;
    setState((previous) =>
      samePath
        ? { ...previous, error: null, loading: true }
        : { data: null, error: null, loading: true },
    );

    api
      .get<{ data: T }>(path)
      .then((payload) => {
        if (cancelled) return;
        setState({ data: payload.data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState((previous) => ({
          data: samePath ? previous.data : null,
          error:
            error instanceof ApiError || error instanceof Error
              ? error.message
              : 'Something went wrong loading this page.',
          loading: false,
        }));
      });

    // Ignore a response that arrives after the path changed or the page unmounted.
    return () => {
      cancelled = true;
    };
  }, [path, attempt]);

  return { ...state, reload, setData };
}
