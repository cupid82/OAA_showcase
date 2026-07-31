/**
 * The only place `fetch` is called. Attaches the JWT, unwraps the
 * `{ data } | { error }` convention, and bounces expired sessions to /login.
 *
 * In dev, Vite proxies /api to the backend (see vite.config.ts), so BASE_URL
 * stays empty unless you point at a deployed API.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

const TOKEN_KEY = 'oaa.token';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(message: string, status: number, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  /**
   * Set on the login request. Without it, a wrong password (401) would kick the
   * user off the login page and into a redirect loop.
   */
  skipAuthRedirect?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthRedirect, headers, ...init } = options;
  const token = tokenStore.get();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (response.status === 401 && !skipAuthRedirect) {
    tokenStore.clear();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login?expired=1');
    }
    throw new ApiError('Your session has expired. Please log in again.', 401);
  }

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string; details?: Record<string, string[]> };
  } | null;

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.error?.details,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, options),
  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T = void>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
