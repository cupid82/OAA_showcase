import { Placeholder } from '@/pages/landing/components/Placeholder';
import { PRINCIPAL } from '@/pages/landing/landingData';

export function PrincipalMessage() {
  return (
    <section id="principal" className="relative isolate overflow-hidden bg-brand-900 text-white">
      <div aria-hidden="true" className="drafting absolute inset-0 -z-10 opacity-70" />

      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex items-center gap-4 border-t border-white/20 pt-4">
          <span className="kicker text-brand-300">02</span>
          <span className="kicker text-ink-400">From the principal</span>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div>
            <Placeholder
              label={PRINCIPAL.name}
              showLabel={false}
              onDark
              className="aspect-4/5 w-full max-w-[240px]"
            />
            <p className="mt-5 font-serif text-xl">{PRINCIPAL.name}</p>
            <p className="kicker mt-2 text-brand-300">{PRINCIPAL.designation}</p>
            <p className="mt-3 text-sm text-ink-400">{PRINCIPAL.credentials}</p>
          </div>

          <div className="border-l border-white/15 pl-6 sm:pl-10">
            <blockquote className="font-serif text-[clamp(1.25rem,2.4vw,1.875rem)] leading-[1.45] text-ink-100">
              {PRINCIPAL.message}
            </blockquote>
            <p className="kicker mt-8 flex items-center gap-3 text-ink-400">
              <span aria-hidden="true" className="h-px w-8 bg-brand-400" />
              {PRINCIPAL.name}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
