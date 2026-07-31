import { cn } from '@/lib/cn';
import { Section } from '@/pages/landing/components/Section';
import { PLACEMENTS } from '@/pages/landing/landingData';

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

export function Placements() {
  return (
    <Section
      id="placements"
      index="08"
      eyebrow="Outcomes"
      title="Placements"
      description="2025–26 recruitment season, across all six departments."
      className="bg-white"
    >
      <dl className="grid grid-cols-2 border-t border-ink-300 lg:grid-cols-4">
        {PLACEMENTS.headline.map((stat, index) => (
          <div
            key={stat.label}
            className={cn('border-ink-200 py-6 pr-5', CELL[index % CELL.length])}
          >
            <dd className="font-serif text-3xl text-ink-900">{stat.value}</dd>
            <dt className="kicker mt-2 text-ink-500">{stat.label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-14 grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h3 className="kicker border-b border-ink-900 pb-3 text-ink-900">Placed by department</h3>

          <ul>
            {PLACEMENTS.byDepartment.map((row) => (
              <li key={row.department} className="border-b border-ink-200 py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-ink-700">{row.department}</span>
                  <span className="font-serif text-lg text-ink-900">{row.percent}%</span>
                </div>
                {/* A rule that fills, not a pill-shaped bar. */}
                <div
                  className="mt-3 h-px w-full bg-ink-200"
                  role="img"
                  aria-label={`${row.department}: ${row.percent} percent placed`}
                >
                  <div
                    className="h-0.5 -translate-y-px bg-brand-600"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="kicker border-b border-ink-900 pb-3 text-ink-900">Top recruiters</h3>

          <ul className="grid grid-cols-2">
            {PLACEMENTS.recruiters.map((recruiter, index) => (
              <li
                key={recruiter}
                className={cn(
                  'border-b border-ink-200 py-3.5 text-sm text-ink-700',
                  index % 2 === 1 && 'border-l border-ink-200 pl-4',
                )}
              >
                {recruiter}
              </li>
            ))}
          </ul>

          <p className="kicker mt-5 text-ink-500">…and 138 more recruiting this year</p>
        </div>
      </div>
    </Section>
  );
}
