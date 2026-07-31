import { cn } from '@/lib/cn';

interface LoadingProps {
  label?: string;
  /** `page` centres in the viewport; `inline` sits in the flow. */
  variant?: 'page' | 'inline';
  className?: string;
}

export function Loading({ label = 'Loading…', variant = 'inline', className }: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-3 text-ink-500',
        variant === 'page' ? 'min-h-[60vh]' : 'py-10',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600"
      />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
