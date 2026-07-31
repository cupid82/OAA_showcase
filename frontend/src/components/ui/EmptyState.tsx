import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional call to action — a button or link. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'lattice-ink flex flex-col items-center border border-ink-300 px-6 py-14 text-center',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="mb-4 flex size-10 items-center justify-center border border-ink-300 bg-ink-50 text-ink-400"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-5"
        >
          <path d="M4 7h16M4 12h10M4 17h7" strokeLinecap="round" />
        </svg>
      </span>
      <p className="font-serif text-xl text-ink-900">{title}</p>
      {description && <p className="mt-2 max-w-sm text-sm text-ink-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
