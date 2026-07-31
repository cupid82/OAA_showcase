import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface SectionProps {
  id: string;
  /** Two-digit section number, printed in the rule above the heading. */
  index: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Section({
  id,
  index,
  eyebrow,
  title,
  description,
  children,
  className,
}: SectionProps) {
  return (
    <section id={id} className={cn('py-16 sm:py-24', className)}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-4 border-t border-ink-300 pt-4">
          <span className="kicker text-brand-600">{index}</span>
          {eyebrow && <span className="kicker text-ink-500">{eyebrow}</span>}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
          <h2 className="font-serif text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.1] font-normal text-ink-900">
            {title}
          </h2>
          {description && <p className="text-ink-600 lg:pb-2">{description}</p>}
        </div>

        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
