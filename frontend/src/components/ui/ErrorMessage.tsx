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
      className={cn('rounded-xl border border-red-200 bg-red-50 p-4 text-red-800', className)}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
        >
          Try again
        </button>
      )}
    </div>
  );
}
