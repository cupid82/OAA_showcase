import { cn } from '@/lib/cn';
import type { Provider } from '@/types';

/**
 * Connected apps are marked with a monogram tile rather than their logos: it
 * keeps the portal's own type doing the work, and it reads as "a link to your
 * account there", not as an endorsement.
 */
const MARK: Record<Provider, string> = {
  github: 'GH',
  linkedin: 'in',
  x: 'X',
  leetcode: 'LC',
  codeforces: 'CF',
  kaggle: 'K',
  behance: 'Bē',
  website: 'www',
};

export function ProviderMark({
  provider,
  connected,
  className,
}: {
  provider: Provider;
  connected: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-11 shrink-0 items-center justify-center border font-mono text-sm font-medium',
        connected
          ? 'border-ink-900 bg-ink-900 text-ink-50'
          : 'border-ink-300 bg-white text-ink-500',
        className,
      )}
    >
      {MARK[provider]}
    </span>
  );
}
