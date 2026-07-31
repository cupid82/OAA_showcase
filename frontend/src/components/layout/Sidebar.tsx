import { NavLink } from 'react-router-dom';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { NAV_BY_ROLE, ROLE_LABEL } from '@/lib/nav';
import type { Role } from '@/types';

interface SidebarProps {
  role: Role;
  /** Closes the mobile drawer after a navigation. */
  onNavigate?: () => void;
}

export function Sidebar({ role, onNavigate }: SidebarProps) {
  return (
    <nav aria-label="Section navigation" className="flex h-full flex-col px-5 py-6">
      <p className="kicker pb-4 text-ink-400">{ROLE_LABEL[role]}</p>

      {NAV_BY_ROLE[role].map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          // `end` on the dashboard only, so /student doesn't stay active on /student/marks.
          end={item.to === `/${role}`}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 border-l-2 py-2.5 pl-4 text-sm transition',
              isActive
                ? 'border-brand-600 text-ink-900'
                : 'border-transparent text-ink-600 hover:border-ink-300 hover:text-ink-900',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} className={cn('size-5', isActive && 'text-brand-600')} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
