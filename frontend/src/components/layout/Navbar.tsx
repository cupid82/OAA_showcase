import { Link, useNavigate } from 'react-router-dom';

import { Icon } from '@/components/ui/Icon';
import { HOME_BY_ROLE, useAuth } from '@/context/AuthContext';
import { ROLE_LABEL } from '@/lib/nav';

interface NavbarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

function initialsOf(name: string) {
  return name
    .replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Navbar({ onToggleSidebar, sidebarOpen }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
          className="rounded-lg p-2 text-ink-600 transition hover:bg-ink-100 lg:hidden"
        >
          <Icon name={sidebarOpen ? 'close' : 'menu'} />
        </button>

        <Link
          to={user ? HOME_BY_ROLE[user.role] : '/'}
          className="flex items-center gap-2 font-semibold text-ink-900"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon name="cap" className="size-5" />
          </span>
          <span className="hidden sm:inline">OAA Portal</span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm leading-tight font-medium text-ink-900">{user.name}</p>
                <p className="text-xs text-ink-500">
                  {ROLE_LABEL[user.role]} · {user.loginId}
                </p>
              </div>
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
              >
                {initialsOf(user.name)}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100"
              >
                <Icon name="logout" className="size-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
