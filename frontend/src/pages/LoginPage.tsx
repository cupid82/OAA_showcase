import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Icon } from '@/components/ui/Icon';
import { HOME_BY_ROLE, useAuth } from '@/context/AuthContext';
import { DEMO_ACCOUNTS } from '@/lib/mockAuth';
import { cn } from '@/lib/cn';
import { ROLE_LABEL } from '@/lib/nav';
import { ROLES } from '@/types';
import type { Role } from '@/types';

function parseRole(value: string | null): Role {
  return ROLES.includes(value as Role) ? (value as Role) : 'student';
}

const ID_LABEL: Record<Role, string> = {
  student: 'Roll number',
  teacher: 'Staff ID',
  admin: 'Admin ID',
};

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, status, login } = useAuth();

  const [role, setRole] = useState<Role>(() => parseRole(searchParams.get('role')));
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const expired = searchParams.get('expired') === '1';
  const next = searchParams.get('next');

  // Keep the tab in sync when the landing page links straight to a role.
  useEffect(() => setRole(parseRole(searchParams.get('role'))), [searchParams]);

  if (status === 'authenticated' && user) {
    return <Navigate to={next ?? HOME_BY_ROLE[user.role]} replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const signedIn = await login(loginId, password, role);
      navigate(next ?? HOME_BY_ROLE[signedIn.role], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function switchRole(nextRole: Role) {
    setRole(nextRole);
    setError(null);
    setLoginId('');
    setPassword('');
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Link to="/" className="mb-8 flex items-center gap-2 self-center text-ink-900">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon name="cap" />
          </span>
          <span className="text-lg font-semibold">OAA Portal</span>
        </Link>

        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-semibold text-ink-900">Sign in</h1>
          <p className="mt-1 text-sm text-ink-500">Choose your role and enter your credentials.</p>

          <div
            role="tablist"
            aria-label="Login role"
            className="mt-5 flex gap-1 rounded-xl bg-ink-100 p-1"
          >
            {ROLES.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={role === option}
                onClick={() => switchRole(option)}
                className={cn(
                  'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition',
                  role === option
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-ink-600 hover:text-ink-900',
                )}
              >
                {ROLE_LABEL[option] === 'Administrator' ? 'Admin' : ROLE_LABEL[option]}
              </button>
            ))}
          </div>

          {expired && (
            <p className="mt-4 rounded-lg bg-accent-400/15 px-3 py-2 text-sm text-accent-600">
              Your session expired. Please sign in again.
            </p>
          )}

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="loginId" className="mb-1.5 block text-sm font-medium text-ink-700">
                {ID_LABEL[role]}
              </label>
              <input
                id="loginId"
                name="loginId"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                autoComplete="username"
                required
                className="w-full rounded-lg border border-ink-300 px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400"
                placeholder={DEMO_ACCOUNTS[role].user.loginId}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-ink-300 px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400"
                placeholder="••••••••"
              />
            </div>

            {error && <ErrorMessage title="Sign-in failed" message={error} />}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : `Sign in as ${ROLE_LABEL[role].toLowerCase()}`}
            </button>
          </form>

          {/* Remove this block when the real auth API lands (Step 2). */}
          <div className="mt-5 rounded-lg border border-dashed border-ink-300 bg-ink-50 p-3 text-xs text-ink-600">
            <p className="font-semibold text-ink-700">Demo account (mock auth, no backend yet)</p>
            <p className="mt-1 font-mono">
              {DEMO_ACCOUNTS[role].user.loginId} / {DEMO_ACCOUNTS[role].password}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoginId(DEMO_ACCOUNTS[role].user.loginId);
                setPassword(DEMO_ACCOUNTS[role].password);
              }}
              className="mt-2 font-medium text-brand-700 underline underline-offset-2"
            >
              Fill it in
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-ink-500">
            Accounts are created by the college administrator. There is no public sign-up.
          </p>
        </div>

        <Link
          to="/"
          className="mt-6 self-center text-sm font-medium text-ink-500 transition hover:text-ink-800"
        >
          ← Back to the college website
        </Link>
      </div>
    </div>
  );
}
