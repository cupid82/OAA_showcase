import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-ink-200 bg-white p-5 shadow-card', className)}>
      {children}
    </div>
  );
}
