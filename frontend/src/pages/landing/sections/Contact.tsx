import { useState } from 'react';

import { Icon } from '@/components/ui/Icon';
import { Section } from '@/pages/landing/components/Section';
import { COLLEGE } from '@/pages/landing/landingData';

const DETAILS = [
  { icon: 'pin', label: 'Address', value: COLLEGE.address },
  { icon: 'phone', label: 'Phone', value: COLLEGE.phone },
  { icon: 'mail', label: 'Email', value: COLLEGE.email },
] as const;

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
      eyebrow="Get in touch"
      title="Contact us"
      description="Admissions, academics or anything else — the office replies within two working days."
      className="bg-white"
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <dl className="space-y-5">
            {DETAILS.map((detail) => (
              <div key={detail.label} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon name={detail.icon} />
                </span>
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                    {detail.label}
                  </dt>
                  <dd className="mt-0.5 text-ink-800">{detail.value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div
            role="img"
            aria-label="Placeholder for the campus location map"
            className="mt-8 flex aspect-16/9 items-center justify-center rounded-xl border border-dashed border-ink-300 bg-ink-100 text-sm text-ink-500"
          >
            Map embed goes here
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-ink-200 bg-ink-50 p-6 shadow-card"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="contact-name"
                className="mb-1.5 block text-sm font-medium text-ink-700"
              >
                Full name
              </label>
              <input
                id="contact-name"
                name="name"
                required
                className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="contact-email"
                className="mb-1.5 block text-sm font-medium text-ink-700"
              >
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="contact-subject"
              className="mb-1.5 block text-sm font-medium text-ink-700"
            >
              Subject
            </label>
            <input
              id="contact-subject"
              name="subject"
              required
              className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div className="mt-4">
            <label
              htmlFor="contact-message"
              className="mb-1.5 block text-sm font-medium text-ink-700"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              required
              className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Send message
          </button>

          {submitted && (
            <p role="status" className="mt-3 text-sm text-ink-600">
              This form has no backend yet — nothing was sent. Wire it up when the contact endpoint
              exists.
            </p>
          )}
        </form>
      </div>
    </Section>
  );
}
