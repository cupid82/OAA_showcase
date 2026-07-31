import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface SectionProps {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Centres the heading block — used by the wider, card-based sections. */
  centered?: boolean;
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  centered = false,
}: SectionProps) {
  return (
    <section id={id} className={cn('py-16 sm:py-20', className)}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className={cn('max-w-2xl', centered && 'mx-auto text-center')}>
          {eyebrow && (
            <p className="text-xs font-semibold tracking-widest text-brand-600 uppercase">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            {title}
          </h2>
          {description && <p className="mt-3 text-ink-600">{description}</p>}
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
