import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('border border-ink-300 bg-white p-6', className)}>{children}</div>;
}
