import { cn } from '@/lib/cn';

/**
 * Stand-in for a real photograph. A drafting plate — dot lattice, inner rule and a
 * centre crosshair — so the layout is honest about what is missing instead of
 * shipping stock images that will be replaced anyway. Swap for <img> when real
 * photos exist.
 */
interface PlaceholderProps {
  label: string;
  className?: string;
  /** Renders the caption; turn off for backgrounds and avatars. */
  showLabel?: boolean;
  /** Inverts the plate for use on a dark section. */
  onDark?: boolean;
}

export function Placeholder({
  label,
  className,
  showLabel = true,
  onDark = false,
}: PlaceholderProps) {
  const line = onDark ? 'bg-white/25' : 'bg-ink-400/60';

  return (
    <div
      role="img"
      aria-label={`Placeholder image: ${label}`}
      className={cn(
        'relative isolate flex items-end overflow-hidden border',
        onDark ? 'border-white/20 bg-white/[0.03]' : 'border-ink-300 bg-ink-100',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('absolute inset-0', onDark ? 'lattice opacity-40' : 'lattice-ink opacity-30')}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-3 border',
          onDark ? 'border-white/12' : 'border-ink-300/70',
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2"
      >
        <span className={cn('absolute top-1/2 left-0 h-px w-full', line)} />
        <span className={cn('absolute top-0 left-1/2 h-full w-px', line)} />
      </span>

      {showLabel && (
        <span
          className={cn(
            'kicker relative z-10 w-full px-4 py-3',
            onDark ? 'text-ink-300' : 'text-ink-500',
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
