import { Icon } from '@/components/ui/Icon';
import { LoginButtons } from '@/pages/landing/components/LoginButtons';
import { COLLEGE } from '@/pages/landing/landingData';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-brand-900 text-white">
      {/* Placeholder for the campus photograph. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 25%, rgba(255,255,255,0.5) 0, transparent 40%), radial-gradient(circle at 85% 15%, rgba(251,191,36,0.6) 0, transparent 35%)',
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-brand-100 ring-1 ring-white/20">
            <Icon name="sparkle" className="size-4" />
            Overall Ability Assessment · beyond marks alone
          </p>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{COLLEGE.name}</h1>
          <p className="mt-3 text-xl font-medium text-accent-400">{COLLEGE.tagline}</p>
          <p className="mt-5 max-w-xl text-base text-brand-100 sm:text-lg">{COLLEGE.intro}</p>

          <LoginButtons variant="solid" className="mt-8" />

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-100">
            {COLLEGE.accreditations.map((item) => (
              <span key={item} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-400" />
                {item}
              </span>
            ))}
          </div>

          <a
            href="#courses"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white underline underline-offset-4 hover:text-accent-400"
          >
            Explore our courses
            <Icon name="arrowRight" className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
