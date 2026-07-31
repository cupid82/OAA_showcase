import { Icon } from '@/components/ui/Icon';
import { Placeholder } from '@/pages/landing/components/Placeholder';
import { Section } from '@/pages/landing/components/Section';
import { formatDate } from '@/pages/landing/format';
import { NEWS } from '@/pages/landing/landingData';

export function News() {
  return (
    <Section
      id="news"
      eyebrow="Newsroom"
      title="Latest news"
      description="Research, results and what is changing on campus."
      className="bg-white"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {NEWS.map((item, index) => (
          <article
            key={item.title}
            className="group flex flex-col overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card transition hover:border-brand-300 hover:shadow-lg"
          >
            <Placeholder
              label={item.category}
              index={index}
              showLabel={false}
              className="aspect-16/7"
            />
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center gap-3 text-xs text-ink-500">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">
                  {item.category}
                </span>
                <time dateTime={item.date}>{formatDate(item.date)}</time>
              </div>
              <h3 className="mt-3 font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm text-ink-600">{item.excerpt}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                Read more
                <Icon name="arrowRight" className="size-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
