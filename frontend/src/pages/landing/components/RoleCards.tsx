import { Link } from 'react-router-dom';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { ROLE_ENTRIES } from '@/pages/landing/landingData';

/**
 * The three portal entry points. Each preselects its tab on the login page —
 * this is the primary way anyone gets into the app, so it gets the space.
 */
export function RoleCards({ className }: { className?: string }) {
  return (
    <div className={cn('grid border-t border-ink-300 sm:grid-cols-3', className)}>
      {ROLE_ENTRIES.map((entry, index) => (
        <Link
          key={entry.role}
          to={`/login?role=${entry.role}`}
          className={cn(
            'group flex flex-col gap-3 border-b border-ink-300 px-1 py-8 transition sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:pr-0',
            index > 0 && 'sm:border-l',
            'hover:bg-white/70',
          )}
        >
          <Icon
            name={entry.icon}
            className="size-6 text-ink-400 transition group-hover:text-brand-600"
          />

          <span className="font-serif text-2xl text-ink-900">{entry.label}</span>

          <span className="max-w-xs text-sm leading-relaxed text-ink-600">{entry.blurb}</span>

          <span className="kicker mt-2 flex items-center gap-2 text-brand-700">
            Sign in
            <span
              aria-hidden="true"
              className="h-px w-6 bg-brand-400 transition-all group-hover:w-10"
            />
          </span>
        </Link>
      ))}
    </div>
  );
}
