import type { ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';

const VARIANTS: Record<Variant, string> = {
  primary:
    'border border-brand-600 bg-brand-600 text-white hover:border-brand-500 hover:bg-brand-500',
  secondary: 'border border-ink-300 bg-white text-ink-800 hover:border-ink-400 hover:bg-ink-100',
  ghost: 'border border-transparent text-brand-700 hover:bg-brand-50',
  danger: 'border border-red-600 bg-red-600 text-white hover:border-red-500 hover:bg-red-500',
  /** For the dark plate — a light button on ink. */
  dark: 'border border-ink-50 bg-ink-50 text-ink-900 hover:bg-white',
};

const SIZES = { sm: 'px-3 py-2', md: 'px-5 py-3' } as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** `sm` for toolbars and rows; the default suits a form's main action. */
  size?: 'sm' | 'md';
}

const base =
  'kicker inline-flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-50';

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
      className={cn(base, SIZES[size], VARIANTS[variant], className)}
      {...props}
    />
  );
}

/** A link that looks exactly like a `Button`. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: LinkProps & { variant?: Variant; size?: 'sm' | 'md' }) {
  return <Link className={cn(base, SIZES[size], VARIANTS[variant], className)} {...props} />;
}
