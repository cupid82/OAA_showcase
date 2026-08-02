import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /**
   * Small mono label above the title — the section a page belongs to, not a
   * restatement of it. Optional, so every existing caller is unaffected.
   */
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-ink-200 pb-6">
      <div className="min-w-0">
        {eyebrow && <p className="kicker mb-2.5 text-brand-700">{eyebrow}</p>}
        {/*
          Larger than the section headings beneath it by a clear step. The old
          size sat close enough to an `h2` that a page read as a list of equal
          parts with a label on top.
        */}
        <h1 className="font-serif text-4xl text-ink-900">{title}</h1>
        {description && <p className="prose-measure mt-2.5 text-ink-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
