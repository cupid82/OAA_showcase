import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { ROLES } from '@/types';

const LABEL: Record<string, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin',
};

interface LoginButtonsProps {
  /** `solid` for the hero, `compact` for the nav bar. */
  variant?: 'solid' | 'compact';
  className?: string;
  onNavigate?: () => void;
}

/** The three role entry points. Each preselects its tab on the login page. */
export function LoginButtons({ variant = 'compact', className, onNavigate }: LoginButtonsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {ROLES.map((role, index) => (
        <Link
          key={role}
          to={`/login?role=${role}`}
          onClick={onNavigate}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-semibold transition',
            variant === 'solid'
              ? index === 0
                ? 'bg-white text-brand-800 hover:bg-brand-50'
                : 'border border-white/40 text-white hover:bg-white/10'
              : index === 0
                ? 'bg-brand-600 text-white hover:bg-brand-700'
                : 'border border-ink-200 text-ink-700 hover:bg-ink-100',
          )}
        >
          {LABEL[role]} login
        </Link>
      ))}
    </div>
  );
}
