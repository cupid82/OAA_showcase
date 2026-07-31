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
    <nav aria-label="Section navigation" className="flex h-full flex-col gap-1 p-4">
      <p className="px-3 pb-2 text-xs font-semibold tracking-wider text-ink-400 uppercase">
        {ROLE_LABEL[role]}
      </p>

      {NAV_BY_ROLE[role].map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          // `end` on the dashboard only, so /student doesn't stay active on /student/marks.
          end={item.to === `/${role}`}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
            )
          }
        >
          <Icon name={item.icon} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
