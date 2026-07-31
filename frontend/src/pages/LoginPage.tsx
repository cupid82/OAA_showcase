import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Icon } from '@/components/ui/Icon';
import { HOME_BY_ROLE, useAuth } from '@/context/AuthContext';
import { DEMO_ACCOUNTS } from '@/lib/mockAuth';
import { cn } from '@/lib/cn';
import { ROLE_LABEL } from '@/lib/nav';
import { COLLEGE } from '@/pages/landing/landingData';
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

const FIELD =
  'w-full border-b border-ink-300 bg-transparent py-2.5 text-ink-900 transition placeholder:text-ink-400 focus:border-brand-600';

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
    <div className="relative isolate flex min-h-screen flex-col bg-ink-50">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-linear-to-b from-brand-50 via-ink-50 to-ink-50"
      />
      <div
        aria-hidden="true"
        className="lattice-ink absolute inset-0 -z-10 opacity-[0.18] [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent_70%)]"
      />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-14">
        <Link to="/" className="flex items-baseline gap-2.5 self-center">
          <span className="font-serif text-2xl text-ink-900">{COLLEGE.short}</span>
          <span className="kicker text-ink-400">Portal</span>
        </Link>

        <div className="mt-10 border-t border-ink-300 pt-8">
          <h1 className="font-serif text-3xl text-ink-900">Sign in</h1>
          <p className="mt-2 text-ink-600">Choose your role, then enter your credentials.</p>

          <div role="tablist" aria-label="Login role" className="mt-8 grid grid-cols-3">
            {ROLES.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={role === option}
                onClick={() => switchRole(option)}
                className={cn(
                  'kicker border-b-2 pb-3 transition',
                  role === option
                    ? 'border-brand-600 text-ink-900'
                    : 'border-ink-300 text-ink-500 hover:text-ink-800',
                )}
              >
                {ROLE_LABEL[option] === 'Administrator' ? 'Admin' : ROLE_LABEL[option]}
              </button>
            ))}
          </div>

          {expired && (
            <p className="mt-6 border-l-2 border-accent-500 bg-accent-400/10 px-4 py-3 text-sm text-ink-700">
              Your session expired. Please sign in again.
            </p>
          )}

          <form className="mt-8" onSubmit={handleSubmit}>
            <label htmlFor="loginId" className="kicker block text-ink-500">
              {ID_LABEL[role]}
            </label>
            <input
              id="loginId"
              name="loginId"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              autoComplete="username"
              required
              className={FIELD}
              placeholder={DEMO_ACCOUNTS[role].user.loginId}
            />

            <label htmlFor="password" className="kicker mt-7 block text-ink-500">
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
              className={FIELD}
              placeholder="••••••••"
            />

            {error && (
              <div className="mt-6">
                <ErrorMessage title="Sign-in failed" message={error} />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="kicker mt-9 flex w-full items-center justify-center gap-3 border border-brand-600 bg-brand-600 px-6 py-3.5 text-white transition hover:border-brand-500 hover:bg-brand-500 disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : `Continue as ${ROLE_LABEL[role].toLowerCase()}`}
              {!submitting && <Icon name="arrowRight" className="size-4" />}
            </button>
          </form>

          {/* Remove this block when the real auth API lands (Step 2). */}
          <div className="mt-8 border-t border-ink-300 pt-5">
            <p className="kicker text-ink-500">Demo account · mock auth, no backend yet</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-sm text-ink-700">
                {DEMO_ACCOUNTS[role].user.loginId} / {DEMO_ACCOUNTS[role].password}
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoginId(DEMO_ACCOUNTS[role].user.loginId);
                  setPassword(DEMO_ACCOUNTS[role].password);
                }}
                className="kicker text-brand-700 underline underline-offset-4 hover:text-brand-600"
              >
                Fill it in
              </button>
            </div>
          </div>

          <p className="mt-8 text-sm text-ink-500">
            Accounts are created by the college administrator. There is no public sign-up.
          </p>
        </div>

        <Link
          to="/"
          className="kicker mt-10 self-center text-ink-500 transition hover:text-ink-900"
        >
          ← Back to the website
        </Link>
      </div>
    </div>
  );
}
