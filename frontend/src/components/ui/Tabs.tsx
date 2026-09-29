import { cn } from '@/lib/cn';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * Underline tabs — the same treatment as the login page's old role switcher.
 * The panel content is the caller's; this only switches the value.
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      // `overflow-y-hidden`: with only `overflow-x-auto`, the browser also makes the
      // y-axis scrollable and a stray scrollbar appears beside the tabs.
      className={cn(
        'flex gap-6 overflow-x-auto overflow-y-hidden border-b border-ink-300',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'kicker flex shrink-0 items-center gap-2 border-b-2 pb-3 transition',
              active
                ? 'border-brand-600 text-ink-900'
                : 'border-transparent text-ink-500 hover:text-ink-800',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'min-w-5 px-1 py-0.5 text-center text-[10px] leading-none',
                  active ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-600',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A filter chip — for narrowing a list, not for navigation. */
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'kicker border px-3 py-1.5 transition',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-ink-300 bg-white text-ink-600 hover:border-ink-400 hover:text-ink-900',
      )}
    >
      {children}
    </button>
  );
}
