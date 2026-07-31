import { Link } from 'react-router-dom';

import { HOME_BY_ROLE, useAuth } from '@/context/AuthContext';

export default function NotFoundPage() {
  const { user } = useAuth();
  const home = user ? HOME_BY_ROLE[user.role] : '/';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-4 text-center">
      <p className="text-sm font-semibold tracking-widest text-brand-600 uppercase">404</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">
        That address doesn&apos;t exist in the portal. It may have moved, or it belongs to a module
        that hasn&apos;t been built yet.
      </p>
      <Link
        to={home}
        className="mt-6 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        {user ? 'Back to dashboard' : 'Back to home'}
      </Link>
    </div>
  );
}
