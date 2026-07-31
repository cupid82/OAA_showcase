import { cn } from '@/lib/cn';

/**
 * Stand-in for a real photograph. Deterministic gradient + caption, so the layout
 * is honest about what is missing instead of shipping stock images that will be
 * replaced anyway. Swap these for <img> once real photos exist.
 */
const TONES = [
  'from-brand-700 via-brand-600 to-brand-400',
  'from-ink-800 via-ink-700 to-brand-700',
  'from-brand-800 via-brand-600 to-accent-500',
  'from-brand-900 via-brand-700 to-ink-600',
  'from-accent-600 via-brand-600 to-brand-800',
];

interface PlaceholderProps {
  label: string;
  index?: number;
  className?: string;
  /** Renders the caption; turn off for backgrounds and avatars. */
  showLabel?: boolean;
}

export function Placeholder({ label, index = 0, className, showLabel = true }: PlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`Placeholder image: ${label}`}
      className={cn(
        'relative isolate flex items-end overflow-hidden rounded-xl bg-gradient-to-br',
        TONES[index % TONES.length],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, white 0, transparent 45%), radial-gradient(circle at 80% 70%, white 0, transparent 40%)',
        }}
      />
      {showLabel && (
        <span className="relative z-10 w-full bg-gradient-to-t from-ink-900/70 to-transparent p-3 text-sm font-medium text-white">
          {label}
        </span>
      )}
    </div>
  );
}
