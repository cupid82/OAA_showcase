import { Link } from 'react-router-dom';

import { Icon } from '@/components/ui/Icon';
import { ProviderMark } from '@/components/ui/ProviderMark';
import { cn } from '@/lib/cn';
import { LandingFooter } from '@/pages/landing/components/LandingFooter';
import { LandingNav } from '@/pages/landing/components/LandingNav';
import { Section } from '@/pages/landing/components/Section';
import {
  BOUNDARY,
  COLLEGE,
  MODES,
  PRINCIPLES,
  PROMISE,
  PROVIDERS,
  STEPS,
} from '@/pages/landing/landingData';

/**
 * The public home page. Simple on purpose: what OAA is, the six modes, the apps
 * it connects to, how to start — and a clear line between it and the ERP.
 */
export default function LandingPage() {
  return (
    <div id="top" className="min-h-screen bg-white">
      <LandingNav />
      <main>
        <Hero />
        <Modes />
        <Connect />
        <How />
        <Boundary />
        <Principles />
        <FinalCall />
      </main>
      <LandingFooter />
    </div>
  );
}

function Hero() {
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

      <div className="mx-auto grid w-full max-w-6xl gap-14 px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-end">
        <div>
          <p className="kicker flex items-center gap-3 text-brand-700">
            <span aria-hidden="true" className="h-px w-8 bg-brand-400" />
            For students of {COLLEGE.name}
          </p>

          <h1 className="mt-8 max-w-3xl font-serif text-[clamp(2.6rem,7vw,5.25rem)] leading-[1.02] font-normal text-ink-900">
            Build proof of what you can do.
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-600">
            {PROMISE} Ship projects, grow the skills your goal needs, find the events and
            internships that fit — and keep an eye on your own energy while you do.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/login"
              className="kicker inline-flex items-center gap-3 border border-brand-600 bg-brand-600 px-6 py-3.5 text-white transition hover:border-brand-500 hover:bg-brand-500"
            >
              Sign in with your college ID
              <Icon name="arrowRight" className="size-4" />
            </Link>
            <a
              href="#modes"
              className="kicker inline-flex items-center gap-2 text-ink-500 transition hover:text-ink-900"
            >
              See the six modes
              <Icon name="chevronDown" className="size-4" />
            </a>
          </div>
        </div>

        {/*
          The three questions every item on the dashboard must answer — shown as
          the product's contract rather than as a screenshot of made-up data.
        */}
        <div className="border border-ink-300 bg-white">
          <p className="kicker border-b border-ink-200 px-5 py-3 text-ink-500">
            Every item on your dashboard answers
          </p>
          <ol>
            {[
              [
                'Why am I seeing this?',
                'It matches your skills, your goal, or a deadline you saved.',
              ],
              [
                'What do I do?',
                'One clear action — open it, register, tick it off, or dismiss it.',
              ],
              ['By when?', 'The date it matters, or none when it can wait.'],
            ].map(([question, answer], index) => (
              <li
                key={question}
                className="flex gap-4 border-b border-ink-200 px-5 py-4 last:border-b-0"
              >
                <span className="font-serif text-2xl leading-none text-brand-600">{index + 1}</span>
                <div>
                  <p className="font-serif text-lg leading-snug text-ink-900">{question}</p>
                  <p className="mt-1 text-sm text-ink-600">{answer}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Modes() {
  return (
    <Section
      id="modes"
      index="01"
      eyebrow="The six modes"
      title="Everything lives in six places, down the left of the screen."
      description="No tables of marks, no attendance screens. Just the things that move you towards your next opportunity."
    >
      <div className="grid border-t border-ink-300 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((mode, index) => (
          <article
            key={mode.name}
            className={cn(
              'flex flex-col border-b border-ink-300 py-8 pr-6',
              index % 3 !== 0 && 'lg:border-l lg:pl-6',
              index % 2 !== 0 && 'sm:border-l sm:pl-6',
              index % 3 === 0 && 'lg:border-l-0 lg:pl-0',
            )}
          >
            <div className="flex items-center justify-between">
              <Icon name={mode.icon} className="size-6 text-brand-600" />
              <span className="kicker text-ink-400">0{index + 1}</span>
            </div>
            <h3 className="mt-5 font-serif text-2xl text-ink-900">{mode.name}</h3>
            <p className="mt-2 text-ink-600">{mode.line}</p>
            <ul className="mt-5 space-y-2">
              {mode.points.map((point) => (
                <li key={point} className="flex gap-2.5 text-sm text-ink-600">
                  <span aria-hidden="true" className="mt-2 size-1 shrink-0 bg-brand-400" />
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}

function Connect() {
  return (
    <Section
      id="connect"
      index="02"
      eyebrow="Connected apps"
      title="Bring the work you’ve already done."
      description="Link the accounts you use. GitHub syncs your public repositories so you can import them as projects; the rest become links on your portfolio. Nothing is linked, fetched or shown without your say-so."
      className="bg-ink-50"
    >
      <ul className="grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-2 lg:grid-cols-4">
        {PROVIDERS.map((provider) => (
          <li key={provider.id} className="flex items-center gap-4 bg-white px-5 py-5">
            <ProviderMark provider={provider.id} connected={provider.id === 'github'} />
            <div>
              <p className="text-ink-900">{provider.name}</p>
              <p className="mt-0.5 text-xs text-ink-500">{provider.how}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function How() {
  return (
    <Section
      id="how"
      index="03"
      eyebrow="How it works"
      title="Home page, sign in, and you’re on your dashboard."
    >
      <ol className="grid gap-10 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="border-t border-ink-900 pt-5">
            <span className="kicker text-brand-600">Step {index + 1}</span>
            <h3 className="mt-3 font-serif text-2xl text-ink-900">{step.title}</h3>
            <p className="mt-3 text-ink-600">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Boundary() {
  return (
    <Section
      id="boundary"
      index="04"
      eyebrow="Not another ERP"
      title="Your ERP keeps the records. OAA keeps the momentum."
      description="The college system stays the official record. OAA doesn’t copy it or compete with it — where you need something official, it links you there."
      className="bg-sage-50"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink-900">
              <th scope="col" className="kicker w-44 py-3 pr-6 font-medium text-ink-500">
                Area
              </th>
              <th scope="col" className="kicker py-3 pr-6 font-medium text-ink-500">
                The college ERP owns
              </th>
              <th scope="col" className="kicker py-3 font-medium text-brand-700">
                OAA owns
              </th>
            </tr>
          </thead>
          <tbody>
            {BOUNDARY.map((row) => (
              <tr key={row.area} className="border-b border-ink-300">
                <th
                  scope="row"
                  className="py-4 pr-6 align-top font-serif text-lg font-normal text-ink-900"
                >
                  {row.area}
                </th>
                <td className="py-4 pr-6 align-top text-ink-600">{row.erp}</td>
                <td className="py-4 align-top text-ink-900">{row.oaa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Principles() {
  return (
    <Section
      id="principles"
      index="05"
      eyebrow="Principles"
      title="Built for students, not about them."
    >
      <div className="grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-2">
        {PRINCIPLES.map((principle) => (
          <div key={principle.title} className="bg-white px-6 py-7">
            <h3 className="font-serif text-xl text-ink-900">{principle.title}</h3>
            <p className="mt-2 text-ink-600">{principle.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function FinalCall() {
  return (
    <section className="drafting relative overflow-hidden bg-ink-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker text-ink-400">Ready when you are</p>
          <h2 className="mt-4 max-w-2xl font-serif text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.08] text-ink-50">
            Your next opportunity is one project away.
          </h2>
        </div>
        <Link
          to="/login"
          className="kicker inline-flex shrink-0 items-center gap-3 border border-ink-50 bg-ink-50 px-6 py-3.5 text-ink-900 transition hover:bg-white"
        >
          Sign in
          <Icon name="arrowRight" className="size-4" />
        </Link>
      </div>
    </section>
  );
}
