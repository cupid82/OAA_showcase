import { Icon } from '@/components/ui/Icon';
import { Section } from '@/pages/landing/components/Section';
import { dateParts } from '@/pages/landing/format';
import { EVENTS } from '@/pages/landing/landingData';

export function Events() {
  return (
    <Section
      id="events"
      eyebrow="What's on"
      title="Upcoming events"
      description="Symposiums, workshops, sports and outreach — participation counts towards the social dimension of every student's ability score."
      className="bg-ink-50"
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {EVENTS.map((event) => {
          const { day, month } = dateParts(event.date);

          return (
            <li
              key={event.title}
              className="flex items-center gap-4 rounded-xl border border-ink-200 bg-white p-5 shadow-card"
            >
              <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-600 text-white">
                <span className="text-xl leading-none font-semibold">{day}</span>
                <span className="mt-1 text-[11px] tracking-wider">{month}</span>
              </div>
              <div className="min-w-0">
                <span className="rounded-full bg-accent-400/20 px-2.5 py-1 text-xs font-semibold text-accent-600">
                  {event.type}
                </span>
                <h3 className="mt-2 font-semibold text-ink-900">{event.title}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                  <Icon name="pin" className="size-4" />
                  {event.venue}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
