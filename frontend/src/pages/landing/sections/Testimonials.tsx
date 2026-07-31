import { Icon } from '@/components/ui/Icon';
import { Section } from '@/pages/landing/components/Section';
import { TESTIMONIALS } from '@/pages/landing/landingData';

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Testimonials() {
  return (
    <Section
      id="testimonials"
      eyebrow="Alumni"
      title="What our graduates say"
      centered
      className="bg-ink-50"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {TESTIMONIALS.map((item) => (
          <figure
            key={item.name}
            className="flex flex-col rounded-xl border border-ink-200 bg-white p-6 shadow-card"
          >
            <Icon name="quote" className="size-7 text-brand-300" />
            <blockquote className="mt-4 flex-1 text-ink-700">{item.quote}</blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-ink-200 pt-4">
              <span
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700"
              >
                {initials(item.name)}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink-900">{item.name}</span>
                <span className="block text-xs text-ink-500">{item.batch}</span>
                <span className="block text-xs text-ink-500">{item.company}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
