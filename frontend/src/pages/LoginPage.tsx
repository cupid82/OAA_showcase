import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { FIELD } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { HOME_BY_ROLE, useAuth } from '@/context/AuthContext';
import { DEMO_ACCOUNTS } from '@/lib/demoAccounts';
import { COLLEGE } from '@/pages/landing/landingData';
import type { User } from '@/types';

/** Only same-site paths may be used as a post-login destination. */
function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

function destination(user: User, next: string | null): string {
  if (user.role === 'student' && user.onboarded === false) return '/student/welcome';
  // A saved destination from the other role's area would only bounce back.
  if (next && next.startsWith(HOME_BY_ROLE[user.role])) return next;
  return HOME_BY_ROLE[user.role];
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, status, login } = useAuth();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const expired = searchParams.get('expired') === '1';
  const next = safeNext(searchParams.get('next'));

  if (status === 'authenticated' && user) {
    return <Navigate to={destination(user, next)} replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const signedIn = await login(loginId, password);
      navigate(destination(signedIn, next), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
          <span className="font-serif text-3xl leading-none text-ink-900">OAA</span>
          <span className="kicker text-ink-400">for {COLLEGE.short} students</span>
        </Link>

        <div className="mt-10 border-t border-ink-300 pt-8">
          <h1 className="font-serif text-3xl text-ink-900">Sign in</h1>
          <p className="mt-2 text-ink-600">
            Use the roll number and password your college gave you.
          </p>

          {expired && (
            <p className="mt-6 border-l-2 border-accent-500 bg-accent-400/10 px-4 py-3 text-sm text-ink-700">
              Your session expired. Please sign in again.
            </p>
          )}

          <form className="mt-8" onSubmit={handleSubmit}>
            <label htmlFor="loginId" className="kicker block text-ink-500">
              Roll number or staff ID
            </label>
            <input
              id="loginId"
              name="loginId"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              autoComplete="username"
              autoCapitalize="characters"
              required
              className={FIELD}
              placeholder="22CS001"
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
              {submitting ? 'Signing in…' : 'Continue'}
              {!submitting && <Icon name="arrowRight" className="size-4" />}
            </button>
          </form>

          {/* Seeded accounts. Remove this block before real accounts are issued. */}
          <div className="mt-10 border-t border-ink-300 pt-5">
            <p className="kicker text-ink-500">Seeded accounts — click to fill in</p>
            <ul className="mt-3">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.loginId}>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginId(account.loginId);
                      setPassword(account.password);
                      setError(null);
                    }}
                    className="group flex w-full items-baseline gap-4 border-b border-ink-200 py-2.5 text-left transition hover:bg-white"
                  >
                    <span className="w-20 shrink-0 font-mono text-sm text-ink-800">
                      {account.loginId}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink-900 group-hover:text-brand-700">
                        {account.who}
                      </span>
                      <span className="block text-xs text-ink-500">{account.note}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-500">
              Every student password is <span className="font-mono">student123</span>; the
              moderator’s is <span className="font-mono">admin123</span>.
            </p>
          </div>

          <p className="mt-8 text-sm text-ink-500">
            Accounts come from your college’s records. There is no public sign-up.
          </p>
        </div>

        <Link
          to="/"
          className="kicker mt-10 self-center text-ink-500 transition hover:text-ink-900"
        >
          ← Back to the home page
        </Link>
      </div>
    </div>
  );
}
