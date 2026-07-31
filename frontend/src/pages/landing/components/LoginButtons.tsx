import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { ROLES } from '@/types';

const LABEL: Record<string, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin',
};

interface LoginButtonsProps {
  /** `onDark` for the hero and footer, `compact` for the nav bar. */
  variant?: 'onDark' | 'compact';
  className?: string;
  onNavigate?: () => void;
}

/** The three role entry points. Each preselects its tab on the login page. */
export function LoginButtons({ variant = 'compact', className, onNavigate }: LoginButtonsProps) {
  const dark = variant === 'onDark';

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {ROLES.map((role, index) => (
        <Link
          key={role}
          to={`/login?role=${role}`}
          onClick={onNavigate}
          className={cn(
            'kicker border px-4 py-2.5 transition',
            index === 0
              ? 'border-brand-600 bg-brand-600 text-white hover:border-brand-500 hover:bg-brand-500'
              : dark
                ? 'border-white/25 text-ink-200 hover:border-white/70 hover:text-white'
                : 'border-ink-300 text-ink-600 hover:border-ink-900 hover:text-ink-900',
          )}
        >
          {LABEL[role]}
        </Link>
      ))}
    </div>
  );
}
