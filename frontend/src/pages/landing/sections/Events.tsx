import { Icon } from '@/components/ui/Icon';
import { Section } from '@/pages/landing/components/Section';
import { dateParts } from '@/pages/landing/format';
import { EVENTS } from '@/pages/landing/landingData';

export function Events() {
  return (
    <Section
      id="events"
      index="07"
      eyebrow="What's on"
      title="Upcoming events"
      description="Symposiums, workshops, sports and outreach — participation counts towards the social dimension of every student's ability score."
      className="bg-ink-50"
    >
      <ul className="border-t border-ink-300">
        {EVENTS.map((event) => {
          const { day, month } = dateParts(event.date);

          return (
            <li
              key={event.title}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-4 border-b border-ink-200 py-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-8"
            >
              <div className="flex w-14 flex-col self-start border-r border-ink-300 pr-4 sm:self-center">
                <span className="font-serif text-3xl leading-none text-ink-900">{day}</span>
                <span className="kicker mt-1.5 text-brand-600">{month}</span>
              </div>

              <div className="min-w-0">
                <h3 className="font-serif text-xl leading-snug text-ink-900">{event.title}</h3>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-500">
                  <Icon name="pin" className="size-4 shrink-0" />
                  {event.venue}
                </p>
              </div>

              {/* Its own row below the date on mobile; trailing column from sm. */}
              <span className="kicker col-span-2 justify-self-start border border-ink-300 px-3 py-1.5 text-ink-600 sm:col-span-1 sm:justify-self-end">
                {event.type}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
