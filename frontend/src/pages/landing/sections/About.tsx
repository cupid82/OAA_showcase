import { Placeholder } from '@/pages/landing/components/Placeholder';
import { Section } from '@/pages/landing/components/Section';
import { COLLEGE, QUICK_FACTS } from '@/pages/landing/landingData';

export function About() {
  return (
    <Section
      id="about"
      eyebrow="About the institute"
      title={`${COLLEGE.established} onwards, one question: what is a student actually capable of?`}
      className="bg-white"
    >
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <div className="space-y-4 text-ink-600">
          <p>
            {COLLEGE.name} began as a single-block engineering college on the eastern edge of
            Bengaluru and now runs {COLLEGE.accreditations.length > 0 ? 'accredited' : ''}{' '}
            programmes across six departments on a 42-acre campus. Around 4,200 students study here,
            taught by 210 faculty members, more than half of whom hold doctorates.
          </p>
          <p>
            What sets the institute apart is how it keeps score. Alongside marks and attendance,
            every student carries an Overall Ability Assessment — a measured profile across academic
            performance, adaptability, physical wellbeing and social contribution. Mentors record
            it, students can see it, and it travels with them into placements.
          </p>
          <p>
            The result is a record that answers the questions recruiters actually ask: not just what
            a student scored, but how they work, adapt and contribute.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {QUICK_FACTS.map((fact) => (
              <div key={fact.label} className="rounded-xl border border-ink-200 bg-ink-50 p-4">
                <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase">
                  {fact.label}
                </dt>
                <dd className="mt-1 text-lg font-semibold text-ink-900">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Placeholder label="Main building" index={0} className="aspect-4/5" />
          <div className="grid gap-4">
            <Placeholder label="Central library" index={1} className="aspect-square" />
            <Placeholder label="Student commons" index={2} className="aspect-square" />
          </div>
        </div>
      </div>
    </Section>
  );
}
