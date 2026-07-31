import { useState } from 'react';

import { Icon } from '@/components/ui/Icon';
import { Section } from '@/pages/landing/components/Section';
import { COLLEGE } from '@/pages/landing/landingData';

const DETAILS = [
  { icon: 'pin', label: 'Address', value: COLLEGE.address },
  { icon: 'phone', label: 'Phone', value: COLLEGE.phone },
  { icon: 'mail', label: 'Email', value: COLLEGE.email },
] as const;

const FIELD =
  'w-full border-b border-ink-300 bg-transparent py-2.5 text-ink-900 transition focus:border-brand-600';

export function Contact() {
  const [submitted, setSubmitted] = useState(false);

  // No endpoint exists yet — say so rather than pretending the message was sent.
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <Section
      id="contact"
      index="10"
      eyebrow="Get in touch"
      title="Contact us"
      description="Admissions, academics or anything else — the office replies within two working days."
      className="bg-white"
    >
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <dl className="border-t border-ink-300">
            {DETAILS.map((detail) => (
              <div key={detail.label} className="flex gap-5 border-b border-ink-200 py-5">
                <Icon name={detail.icon} className="mt-0.5 size-5 shrink-0 text-brand-600" />
                <div>
                  <dt className="kicker text-ink-500">{detail.label}</dt>
                  <dd className="mt-1.5 text-ink-800">{detail.value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div
            role="img"
            aria-label="Placeholder for the campus location map"
            className="lattice-ink mt-8 flex aspect-16/9 items-center justify-center border border-ink-300 bg-ink-100"
          >
            <span className="kicker bg-ink-100 px-3 text-ink-500">Map embed</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="kicker block text-ink-500">
                Full name
              </label>
              <input id="contact-name" name="name" required className={FIELD} />
            </div>
            <div>
              <label htmlFor="contact-email" className="kicker block text-ink-500">
                Email
              </label>
              <input id="contact-email" name="email" type="email" required className={FIELD} />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="contact-subject" className="kicker block text-ink-500">
              Subject
            </label>
            <input id="contact-subject" name="subject" required className={FIELD} />
          </div>

          <div className="mt-6">
            <label htmlFor="contact-message" className="kicker block text-ink-500">
              Message
            </label>
            <textarea id="contact-message" name="message" rows={5} required className={FIELD} />
          </div>

          <button
            type="submit"
            className="kicker mt-8 border border-brand-600 bg-brand-600 px-6 py-3 text-white transition hover:border-brand-500 hover:bg-brand-500"
          >
            Send message
          </button>

          {submitted && (
            <p role="status" className="mt-4 border-l-2 border-brand-600 pl-3 text-sm text-ink-600">
              This form has no backend yet — nothing was sent. Wire it up when the contact endpoint
              exists.
            </p>
          )}
        </form>
      </div>
    </Section>
  );
}
