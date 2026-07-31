import { Icon } from '@/components/ui/Icon';
import { LoginButtons } from '@/pages/landing/components/LoginButtons';
import { COLLEGE } from '@/pages/landing/landingData';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink-950 text-white">
      {/* Dark, slow-moving colour field. Everything crisp sits on top of it. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-30 bg-linear-to-b from-ink-950 via-brand-950 to-ink-950"
      />
      <div
        aria-hidden="true"
        className="drafting absolute inset-0 -z-20 [mask-image:radial-gradient(120%_100%_at_20%_0%,black,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="lattice absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(90%_80%_at_78%_5%,black,transparent_65%)]"
      />

      <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-14 sm:px-6 sm:pt-24 sm:pb-20">
        <div className="max-w-3xl">
          <p className="kicker flex items-center gap-3 text-brand-200">
            <span aria-hidden="true" className="h-px w-8 bg-brand-400" />
            Overall Ability Assessment
          </p>

          <h1 className="mt-6 font-serif text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.05] font-normal tracking-tight">
            {COLLEGE.name}
          </h1>

          <p className="mt-4 font-serif text-xl text-brand-300 italic sm:text-2xl">
            {COLLEGE.tagline}
          </p>

          <p className="mt-6 max-w-xl border-l border-brand-400/60 pl-4 text-base leading-relaxed text-ink-300 sm:text-lg">
            {COLLEGE.intro}
          </p>

          <LoginButtons variant="onDark" className="mt-9" />

          <a
            href="#courses"
            className="kicker mt-6 inline-flex items-center gap-2 text-ink-300 transition hover:text-white"
          >
            Explore our courses
            <Icon name="arrowRight" className="size-4" />
          </a>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl border-t border-white/15 px-4 sm:px-6">
        <ul className="flex flex-wrap gap-x-8 gap-y-2 py-5">
          {COLLEGE.accreditations.map((item) => (
            <li key={item} className="kicker flex items-center gap-2 text-ink-400">
              <span aria-hidden="true" className="size-1 bg-brand-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
