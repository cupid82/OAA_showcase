import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary:
    'border border-brand-600 bg-brand-600 text-white hover:border-brand-500 hover:bg-brand-500',
  secondary: 'border border-ink-300 bg-white text-ink-800 hover:border-ink-400 hover:bg-ink-100',
  ghost: 'border border-transparent text-brand-700 hover:bg-brand-50',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** `sm` for toolbars and table rows; the default suits a form's main action. */
  size?: 'sm' | 'md';
}

/**
 * The one button in the portal. Same `kicker` type and square corners as the
 * login form's submit — variants only change the fill, never the shape.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'kicker inline-flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-3 py-2' : 'px-5 py-3',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
