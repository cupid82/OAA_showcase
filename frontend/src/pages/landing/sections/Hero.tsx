import { Icon } from '@/components/ui/Icon';
import { RoleCards } from '@/pages/landing/components/RoleCards';
import { COLLEGE } from '@/pages/landing/landingData';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink-50">
      {/* Soft wash, then a faint lattice over it so the field isn't flat. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-linear-to-b from-brand-50 via-ink-50 to-ink-50"
      />
      <div
        aria-hidden="true"
        className="lattice-ink absolute inset-0 -z-10 opacity-[0.18] [mask-image:radial-gradient(80%_60%_at_70%_0%,black,transparent_70%)]"
      />

      <div className="mx-auto w-full max-w-6xl px-4 pt-20 pb-14 sm:px-6 sm:pt-28 sm:pb-20">
        <p className="kicker flex items-center gap-3 text-brand-700">
          <span aria-hidden="true" className="h-px w-8 bg-brand-400" />
          Overall Ability Assessment
        </p>

        <h1 className="mt-8 max-w-3xl font-serif text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] font-normal text-ink-900">
          A student is more than a mark sheet.
        </h1>

        <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-600">{COLLEGE.intro}</p>

        <a
          href="#courses"
          className="kicker mt-8 inline-flex items-center gap-2 text-ink-500 transition hover:text-ink-900"
        >
          Explore our courses
          <Icon name="arrowRight" className="size-4" />
        </a>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <RoleCards />
      </div>
    </section>
  );
}
