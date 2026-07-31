import { Section } from '@/pages/landing/components/Section';
import { COURSES } from '@/pages/landing/landingData';

export function Courses() {
  return (
    <Section
      id="courses"
      index="04"
      eyebrow="Programmes"
      title="Courses on offer"
      description="Undergraduate and postgraduate programmes, all AICTE approved."
      className="bg-white"
    >
      <div className="grid gap-12 lg:grid-cols-2">
        {COURSES.map((group) => (
          <div key={group.level}>
            <h3 className="kicker border-b border-ink-900 pb-3 text-ink-900">{group.level}</h3>

            <ul>
              {group.items.map((course) => (
                <li
                  key={course.name}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink-200 py-4"
                >
                  <span className="font-serif text-lg text-ink-800">{course.name}</span>
                  <span className="kicker flex shrink-0 items-center gap-4 text-ink-500">
                    <span>{course.duration}</span>
                    <span className="text-brand-600">{course.seats} seats</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
