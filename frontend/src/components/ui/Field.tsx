import { forwardRef } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/cn';

/**
 * Form controls in the portal's one field style: an underline, not a box. The
 * login form set it; every other form follows it.
 */
export const FIELD =
  'w-full border-b border-ink-300 bg-transparent py-2.5 text-ink-900 transition placeholder:text-ink-400 focus:border-brand-600 disabled:text-ink-400';

export function Label({
  htmlFor,
  children,
  hint,
  className,
}: {
  htmlFor: string;
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1', className)}>
      <label htmlFor={htmlFor} className="kicker block text-ink-500">
        {children}
      </label>
      {hint && <span className="text-xs text-ink-500">{hint}</span>}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn(FIELD, className)} {...props} />;
  },
);

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(FIELD, 'min-h-24 resize-y leading-relaxed', className)} {...props} />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD, 'cursor-pointer', className)} {...props}>
      {children}
    </select>
  );
}

/** A labelled field: label (with an optional hint on the right), control, help text. */
export function Field({
  id,
  label,
  hint,
  help,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      {children}
      {help && <p className="mt-2 text-xs leading-relaxed text-ink-500">{help}</p>}
    </div>
  );
}

/** A native checkbox — keyboard and screen-reader behaviour come for free. */
export function Checkbox({
  id,
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-3', disabled && 'opacity-60', className)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand-600 disabled:cursor-not-allowed"
      />
      <label htmlFor={id} className={cn('text-sm', !disabled && 'cursor-pointer')}>
        <span className="text-ink-900">{label}</span>
        {description && <span className="mt-0.5 block text-ink-500">{description}</span>}
      </label>
    </div>
  );
}
