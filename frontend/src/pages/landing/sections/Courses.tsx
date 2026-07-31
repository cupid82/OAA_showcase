import { Icon } from '@/components/ui/Icon';
import { Section } from '@/pages/landing/components/Section';
import { COURSES } from '@/pages/landing/landingData';

export function Courses() {
  return (
    <Section
      id="courses"
      eyebrow="Programmes"
      title="Courses on offer"
      description="Undergraduate and postgraduate programmes, all AICTE approved."
      centered
      className="bg-white"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {COURSES.map((group) => (
          <div key={group.level} className="rounded-xl border border-ink-200 bg-ink-50 p-6">
            <h3 className="flex items-center gap-2 font-semibold text-ink-900">
              <Icon name="cap" className="size-5 text-brand-600" />
              {group.level}
            </h3>

            <ul className="mt-4 divide-y divide-ink-200">
              {group.items.map((course) => (
                <li
                  key={course.name}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <span className="text-sm font-medium text-ink-800">{course.name}</span>
                  <span className="flex items-center gap-3 text-xs text-ink-500">
                    <span className="rounded-full bg-white px-2.5 py-1 font-medium ring-1 ring-ink-200">
                      {course.duration}
                    </span>
                    <span>{course.seats} seats</span>
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
