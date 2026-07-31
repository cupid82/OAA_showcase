import { cn } from '@/lib/cn';
import { STATISTICS } from '@/pages/landing/landingData';
import { useCountUp } from '@/pages/landing/useCountUp';

/**
 * Hairlines between cells, per index — two columns on mobile, four from lg.
 * Left padding only where a rule precedes it, so the first cell of every row
 * stays flush with the page grid.
 */
const CELL = [
  'border-b lg:border-b-0',
  'border-l border-b pl-5 lg:border-b-0',
  'lg:border-l lg:pl-5',
  'border-l pl-5',
];

function Stat({
  label,
  value,
  suffix,
  className,
}: {
  label: string;
  value: number;
  suffix: string;
  className?: string;
}) {
  const { ref, value: current } = useCountUp(value);

  return (
    <div className={cn('border-ink-200 py-8 pr-5', className)}>
      <p
        ref={ref}
        className="font-serif text-[clamp(2rem,4.5vw,3.25rem)] leading-none text-ink-900"
      >
        {current.toLocaleString('en-IN')}
        <span className="text-brand-600">{suffix}</span>
      </p>
      <p className="kicker mt-3 text-ink-500">{label}</p>
    </div>
  );
}

export function Statistics() {
  return (
    <section className="border-b border-ink-200 bg-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">
        {STATISTICS.map((stat, index) => (
          <Stat key={stat.label} {...stat} className={CELL[index % CELL.length]} />
        ))}
      </div>
    </section>
  );
}
