import { Icon } from '@/components/ui/Icon';
import { Section } from '@/pages/landing/components/Section';
import { DEPARTMENTS } from '@/pages/landing/landingData';

export function Departments() {
  return (
    <Section
      id="departments"
      eyebrow="Academics"
      title="Six departments, one shared standard"
      description="Each department runs its own labs, mentors and industry partnerships — and reports into the same ability framework."
      centered
      className="bg-ink-50"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {DEPARTMENTS.map((department) => (
          <article
            key={department.code}
            className="flex flex-col rounded-xl border border-ink-200 bg-white p-6 shadow-card transition hover:border-brand-300 hover:shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon name="building" />
              </span>
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-600">
                {department.code}
              </span>
            </div>
            <h3 className="mt-4 font-semibold text-ink-900">{department.name}</h3>
            <p className="mt-2 flex-1 text-sm text-ink-600">{department.blurb}</p>
            <p className="mt-4 text-sm font-medium text-ink-500">
              {department.students.toLocaleString('en-IN')} students enrolled
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
