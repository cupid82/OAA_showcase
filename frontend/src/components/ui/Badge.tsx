import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'brand' | 'solid' | 'accent' | 'muted' | 'danger' | 'dark';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-ink-300 bg-ink-100 text-ink-700',
  brand: 'border-brand-300 bg-brand-50 text-brand-700',
  solid: 'border-brand-600 bg-brand-600 text-white',
  // accent-700 is the text step of the clay ramp — 4.78:1 on the tinted fill.
  accent: 'border-accent-400 bg-accent-400/10 text-accent-700',
  muted: 'border-ink-200 bg-white text-ink-500',
  danger: 'border-red-300 bg-red-50 text-red-700',
  dark: 'border-ink-700 bg-ink-900 text-ink-100',
};

/**
 * The small square label used for statuses, types and sources. Same `kicker`
 * type as every other label in the portal; only the fill changes by tone.
 */
export function Badge({
  tone = 'neutral',
  children,
  className,
  title,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'kicker inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 leading-none',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
