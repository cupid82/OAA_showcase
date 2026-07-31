import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { Section } from '@/pages/landing/components/Section';
import { DEPARTMENTS } from '@/pages/landing/landingData';

/**
 * Which cells get a left hairline: one column on mobile, two from sm, three from lg.
 * The pattern repeats every six cells, so nth-child selectors can't express it —
 * two of them would collide on equal specificity and drop rules at random.
 */
const CELL = [
  '',
  'sm:border-l lg:border-l',
  'lg:border-l',
  'sm:border-l lg:border-l-0',
  'lg:border-l',
  'sm:border-l lg:border-l',
];

export function Departments() {
  return (
    <Section
      id="departments"
      index="03"
      eyebrow="Academics"
      title="Six departments, one shared standard"
      description="Each department runs its own labs, mentors and industry partnerships — and reports into the same ability framework."
      className="bg-ink-50"
    >
      <div className="grid border-t border-ink-300 sm:grid-cols-2 lg:grid-cols-3">
        {DEPARTMENTS.map((department, index) => (
          <article
            key={department.code}
            className={cn(
              'group flex flex-col border-b border-ink-300 p-6 transition hover:bg-white',
              CELL[index % CELL.length],
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="kicker text-brand-600">{department.code}</span>
              <Icon
                name="building"
                className="size-5 text-ink-400 transition group-hover:text-brand-600"
              />
            </div>
            <h3 className="mt-4 font-serif text-xl text-ink-900">{department.name}</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600">{department.blurb}</p>
            <p className="kicker mt-6 text-ink-500">
              {department.students.toLocaleString('en-IN')} students
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
