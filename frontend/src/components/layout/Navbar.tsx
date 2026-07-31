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
          className="p-2 text-ink-600 transition hover:text-ink-900 lg:hidden"
        >
          <Icon name={sidebarOpen ? 'close' : 'menu'} />
        </button>

        <Link to={user ? HOME_BY_ROLE[user.role] : '/'} className="flex items-baseline gap-2.5">
          <span className="font-serif text-xl text-ink-900">Avelin</span>
          <span className="kicker hidden text-ink-400 sm:inline">Portal</span>
        </Link>

        <div className="ml-auto flex items-center gap-4">
          {user && (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm leading-tight text-ink-900">{user.name}</p>
                <p className="kicker mt-1 text-ink-500">
                  {ROLE_LABEL[user.role]} · {user.loginId}
                </p>
              </div>
              <span
                aria-hidden="true"
                className="kicker flex size-9 items-center justify-center border border-ink-300 text-ink-600"
              >
                {initialsOf(user.name)}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="kicker flex items-center gap-2 border border-ink-300 px-3 py-2.5 text-ink-600 transition hover:border-ink-900 hover:text-ink-900"
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
