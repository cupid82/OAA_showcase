import { cn } from '@/lib/cn';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn('border-l-2 border-red-400 bg-red-50/70 px-4 py-3.5 text-red-800', className)}
    >
      <p className="kicker">{title}</p>
      <p className="mt-1.5 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="kicker mt-3 border border-red-300 bg-white px-3 py-2 text-red-700 transition hover:bg-red-100"
        >
          Try again
        </button>
      )}
    </div>
  );
}
