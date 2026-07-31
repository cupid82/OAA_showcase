import { Icon } from '@/components/ui/Icon';
import { Section } from '@/pages/landing/components/Section';
import { PLACEMENTS } from '@/pages/landing/landingData';

export function Placements() {
  return (
    <Section
      id="placements"
      eyebrow="Outcomes"
      title="Placements"
      description="2025–26 recruitment season, across all six departments."
      className="bg-white"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLACEMENTS.headline.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-ink-200 bg-ink-50 p-5">
            <p className="text-2xl font-semibold text-ink-900">{stat.value}</p>
            <p className="mt-1 text-sm text-ink-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-ink-200 p-6">
          <h3 className="flex items-center gap-2 font-semibold text-ink-900">
            <Icon name="chart" className="size-5 text-brand-600" />
            Placed by department
          </h3>

          <ul className="mt-5 space-y-4">
            {PLACEMENTS.byDepartment.map((row) => (
              <li key={row.department}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-ink-700">{row.department}</span>
                  <span className="font-semibold text-ink-900">{row.percent}%</span>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100"
                  role="img"
                  aria-label={`${row.department}: ${row.percent} percent placed`}
                >
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-ink-200 p-6">
          <h3 className="flex items-center gap-2 font-semibold text-ink-900">
            <Icon name="briefcase" className="size-5 text-brand-600" />
            Top recruiters
          </h3>
          <div className="mt-5 flex flex-wrap gap-2">
            {PLACEMENTS.recruiters.map((recruiter) => (
              <span
                key={recruiter}
                className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm font-medium text-ink-700"
              >
                {recruiter}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm text-ink-500">
            …and 138 more companies recruiting on campus this year.
          </p>
        </div>
      </div>
    </Section>
  );
}
