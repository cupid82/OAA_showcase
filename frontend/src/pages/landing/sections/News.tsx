import { Icon } from '@/components/ui/Icon';
import { Section } from '@/pages/landing/components/Section';
import { formatDate } from '@/pages/landing/format';
import { NEWS } from '@/pages/landing/landingData';

export function News() {
  return (
    <Section
      id="news"
      index="06"
      eyebrow="Newsroom"
      title="Latest news"
      description="Research, results and what is changing on campus."
      className="bg-white"
    >
      <ul className="border-t border-ink-300">
        {NEWS.map((item) => (
          <li key={item.title}>
            <a
              href="#news"
              className="group grid gap-x-8 gap-y-3 border-b border-ink-200 py-7 transition hover:bg-ink-50 lg:grid-cols-[180px_minmax(0,1fr)_auto]"
            >
              <div className="kicker flex items-center gap-3 text-ink-500 lg:block">
                <time dateTime={item.date} className="block">
                  {formatDate(item.date)}
                </time>
                <span className="text-brand-600 lg:mt-2 lg:block">{item.category}</span>
              </div>

              <div>
                <h3 className="font-serif text-xl leading-snug text-ink-900">{item.title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
                  {item.excerpt}
                </p>
              </div>

              <span className="kicker flex items-center gap-2 self-center text-ink-400 transition group-hover:text-brand-600">
                Read
                <Icon name="arrowRight" className="size-4 transition group-hover:translate-x-1" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
