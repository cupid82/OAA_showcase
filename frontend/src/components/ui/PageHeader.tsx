import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-ink-300 pb-6">
      <div>
        <h1 className="font-serif text-3xl text-ink-900">{title}</h1>
        {description && <p className="mt-2 text-ink-600">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
