import { STATISTICS } from '@/pages/landing/landingData';
import { useCountUp } from '@/pages/landing/useCountUp';

function Stat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  const { ref, value: current } = useCountUp(value);

  return (
    <div className="text-center">
      <p ref={ref} className="text-4xl font-semibold tracking-tight text-brand-700 sm:text-5xl">
        {current.toLocaleString('en-IN')}
        {suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-ink-500">{label}</p>
    </div>
  );
}

export function Statistics() {
  return (
    <section className="border-y border-ink-200 bg-white py-12">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 sm:px-6 lg:grid-cols-4">
        {STATISTICS.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </div>
    </section>
  );
}
