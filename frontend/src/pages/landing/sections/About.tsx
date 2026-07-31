import { Placeholder } from '@/pages/landing/components/Placeholder';
import { Section } from '@/pages/landing/components/Section';
import { COLLEGE, QUICK_FACTS } from '@/pages/landing/landingData';

export function About() {
  return (
    <Section
      id="about"
      index="01"
      eyebrow="About the institute"
      title={`${COLLEGE.established} onwards, one question: what is a student actually capable of?`}
      description="An autonomous engineering institute on the eastern edge of Bengaluru, running six departments across a 42-acre campus."
      className="bg-white"
    >
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <div className="space-y-5 leading-relaxed text-ink-600">
          <p>
            {COLLEGE.name} began as a single-block engineering college and now runs accredited
            programmes across six departments. Around 4,200 students study here, taught by 210
            faculty members, more than half of whom hold doctorates.
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

          <dl className="grid grid-cols-2 pt-4 sm:grid-cols-4">
            {QUICK_FACTS.map((fact) => (
              <div key={fact.label} className="border-t border-ink-300 py-4 pr-4">
                <dt className="kicker text-ink-500">{fact.label}</dt>
                <dd className="mt-2 font-serif text-2xl text-ink-900">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Placeholder label="Main building" className="aspect-4/5" />
          <div className="grid gap-3">
            <Placeholder label="Central library" className="aspect-square" />
            <Placeholder label="Student commons" className="aspect-square" />
          </div>
        </div>
      </div>
    </Section>
  );
}
