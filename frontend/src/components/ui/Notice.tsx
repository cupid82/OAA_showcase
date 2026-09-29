import type { ReactNode } from 'react';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

type Tone = 'success' | 'info' | 'warning';

const TONES: Record<Tone, string> = {
  success: 'border-brand-600 bg-brand-50/80',
  info: 'border-ink-400 bg-ink-100/70',
  // Clay is for notices and warnings only — never decoration.
  warning: 'border-accent-500 bg-accent-400/10',
};

/**
 * An inline notice. `success` is how a page confirms a save — held *above* any
 * part of the page that reloads, so the refetch that follows a save can never
 * take the confirmation with it.
 */
export function Notice({
  tone = 'info',
  title,
  children,
  onDismiss,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div
      role={tone === 'success' ? 'status' : undefined}
      className={cn(
        'flex items-start gap-3 border-l-2 px-4 py-3 text-sm text-ink-700',
        TONES[tone],
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {title && <p className="kicker text-ink-800">{title}</p>}
        {children && <div className={title ? 'mt-1.5' : undefined}>{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mt-0.5 p-1 text-ink-500 transition hover:text-ink-900"
        >
          <Icon name="close" className="size-4" />
        </button>
      )}
    </div>
  );
}
