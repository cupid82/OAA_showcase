import { Link } from 'react-router-dom';

import { HOME_BY_ROLE, useAuth } from '@/context/AuthContext';

export default function NotFoundPage() {
  const { user } = useAuth();
  const home = user ? HOME_BY_ROLE[user.role] : '/';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-4 text-center">
      <p className="kicker text-brand-700">404</p>
      <h1 className="mt-3 font-serif text-4xl text-ink-900">Nothing lives here</h1>
      <p className="mt-3 max-w-sm text-ink-600">
        That address doesn’t exist in OAA. It may have moved, or the link was mistyped.
      </p>
      <Link
        to={home}
        className="kicker mt-8 border border-brand-600 bg-brand-600 px-5 py-3 text-white transition hover:border-brand-500 hover:bg-brand-500"
      >
        {user ? 'Back to your dashboard' : 'Back to the home page'}
      </Link>
    </div>
  );
}
