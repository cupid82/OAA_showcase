import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';

/**
 * A destructive action that needs a second click. Cheaper than a modal, and the
 * first click can never do damage on its own. Disarms itself after a few seconds.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = 'Click again to confirm',
  size = 'sm',
  disabled,
  className,
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <Button
      variant={armed ? 'danger' : 'secondary'}
      size={size}
      disabled={disabled}
      className={className}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
