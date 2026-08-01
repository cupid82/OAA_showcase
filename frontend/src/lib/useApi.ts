import { useCallback, useEffect, useState } from 'react';

import { ApiError, api } from '@/lib/api';

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Fetches one `{ data }` endpoint and tracks loading/error alongside it, so every
 * page renders the same three states without repeating the wiring.
 *
 * A 401 is already handled globally in `lib/api.ts` (token cleared, redirect to
 * /login), so it never surfaces here.
 */
export function useApi<T>(path: string): ApiState<T> & { reload: () => void } {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: null, loading: true });

    api
      .get<{ data: T }>(path)
      .then((payload) => {
        if (cancelled) return;
        setState({ data: payload.data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          data: null,
          error:
            error instanceof ApiError || error instanceof Error
              ? error.message
              : 'Something went wrong loading this page.',
          loading: false,
        });
      });

    // Ignore a response that arrives after the path changed or the page unmounted.
    return () => {
      cancelled = true;
    };
  }, [path, attempt]);

  return { ...state, reload };
}
