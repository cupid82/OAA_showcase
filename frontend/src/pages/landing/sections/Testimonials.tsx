import { cn } from '@/lib/cn';
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
      index="09"
      eyebrow="Alumni"
      title="What our graduates say"
      description="Three of the 4,200 records this portal keeps — and what came of them."
      className="bg-blush-50"
    >
      <div className="grid border-t border-ink-300 lg:grid-cols-3">
        {TESTIMONIALS.map((item, index) => (
          <figure
            key={item.name}
            className={cn(
              'flex flex-col border-b border-ink-300 py-8 lg:border-b-0 lg:px-8 lg:first:pl-0 lg:last:pr-0',
              index > 0 && 'lg:border-l lg:border-ink-300',
            )}
          >
            <blockquote className="flex-1 font-serif text-xl leading-relaxed text-ink-800">
              <span aria-hidden="true" className="mr-1 text-brand-500">
                “
              </span>
              {item.quote}
            </blockquote>

            <figcaption className="mt-8 flex items-center gap-4 border-t border-ink-200 pt-5">
              <span
                aria-hidden="true"
                className="kicker flex size-11 shrink-0 items-center justify-center border border-ink-300 text-ink-600"
              >
                {initials(item.name)}
              </span>
              <span>
                <span className="block font-serif text-lg text-ink-900">{item.name}</span>
                <span className="kicker mt-1 block text-ink-500">{item.batch}</span>
                <span className="mt-1 block text-sm text-brand-700">{item.company}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
