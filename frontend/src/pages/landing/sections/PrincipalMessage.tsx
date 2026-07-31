import { Icon } from '@/components/ui/Icon';
import { Placeholder } from '@/pages/landing/components/Placeholder';
import { PRINCIPAL } from '@/pages/landing/landingData';

export function PrincipalMessage() {
  return (
    <section id="principal" className="bg-ink-900 py-16 text-white sm:py-20">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[280px_1fr]">
        <div>
          <Placeholder
            label={PRINCIPAL.name}
            index={3}
            showLabel={false}
            className="aspect-square w-full max-w-[280px]"
          />
          <p className="mt-4 text-lg font-semibold">{PRINCIPAL.name}</p>
          <p className="text-sm text-brand-200">{PRINCIPAL.designation}</p>
          <p className="mt-1 text-xs text-ink-400">{PRINCIPAL.credentials}</p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-widest text-accent-400 uppercase">
            From the principal
          </p>
          <Icon name="quote" className="mt-4 size-8 text-brand-400" />
          <blockquote className="mt-3 text-lg leading-relaxed text-ink-100 sm:text-xl">
            {PRINCIPAL.message}
          </blockquote>
          <p className="mt-6 text-sm text-ink-400">
            — {PRINCIPAL.name}, {PRINCIPAL.designation}
          </p>
        </div>
      </div>
    </section>
  );
}
