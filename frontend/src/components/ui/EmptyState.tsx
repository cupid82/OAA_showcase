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
        'flex flex-col items-center rounded-xl border border-dashed border-ink-300 bg-white px-6 py-12 text-center',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="mb-3 flex size-10 items-center justify-center rounded-full bg-ink-100 text-ink-400"
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
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
