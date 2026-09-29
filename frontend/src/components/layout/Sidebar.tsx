import { NavLink } from 'react-router-dom';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { NAV_BY_ROLE, ROLE_LABEL } from '@/lib/nav';
import type { NavItem } from '@/lib/nav';
import { useMeta } from '@/lib/useShared';
import type { Role } from '@/types';

interface SidebarProps {
  role: Role;
  /** Closes the mobile drawer after a navigation. */
  onNavigate?: () => void;
}

function Item({ item, role, onNavigate }: { item: NavItem; role: Role; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      // `end` on the home item only, so /student doesn't stay active everywhere.
      end={item.to === `/${role}`}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 border-l-2 py-2.5 pl-4 text-sm transition',
          isActive
            ? 'border-brand-600 text-ink-900'
            : 'border-transparent text-ink-600 hover:border-ink-300 hover:text-ink-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            name={item.icon}
            className={cn(
              'size-5',
              isActive ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600',
            )}
          />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ role, onNavigate }: SidebarProps) {
  const nav = NAV_BY_ROLE[role];
  const meta = useMeta();

  return (
    <nav aria-label="Modes" className="flex h-full flex-col px-5 py-6">
      <p className="kicker pb-4 text-ink-400">{role === 'student' ? 'Modes' : ROLE_LABEL[role]}</p>

      {nav.primary.map((item) => (
        <Item key={item.to} item={item} role={role} onNavigate={onNavigate} />
      ))}

      {nav.secondary.length > 0 && (
        <>
          <p className="kicker mt-6 border-t border-ink-200 pt-5 pb-3 text-ink-400">You</p>
          {nav.secondary.map((item) => (
            <Item key={item.to} item={item} role={role} onNavigate={onNavigate} />
          ))}
        </>
      )}

      {/*
        The boundary, stated where it is always visible: official records live in
        the ERP. OAA links out rather than copying them.
      */}
      {role === 'student' && meta && (
        <div className="mt-auto pt-8">
          <div className="border border-ink-200 bg-ink-50 px-4 py-4">
            <p className="kicker text-ink-500">Marks, attendance, fees</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-600">
              Official records stay in your college’s system. OAA doesn’t copy them.
            </p>
            <a
              href={meta.erp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="kicker mt-3 inline-flex items-center gap-1.5 text-brand-700 transition hover:text-brand-600"
            >
              Open {meta.erp.name}
              <Icon name="external" className="size-3.5" />
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
