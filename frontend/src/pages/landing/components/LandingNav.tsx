import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/ui/Icon';
import { COLLEGE, NAV_LINKS } from '@/pages/landing/landingData';

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/92 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-baseline gap-2.5">
          <span className="font-serif text-2xl leading-none text-ink-900">OAA</span>
          <span className="kicker hidden text-ink-400 sm:inline">for {COLLEGE.short} students</span>
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="kicker border-b border-transparent py-1 text-ink-500 transition hover:border-brand-600 hover:text-ink-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <Link
          to="/login"
          className="kicker ml-auto hidden items-center gap-2 border border-brand-600 bg-brand-600 px-4 py-2.5 text-white transition hover:border-brand-500 hover:bg-brand-500 sm:inline-flex"
        >
          Sign in
          <Icon name="arrowRight" className="size-4" />
        </Link>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="ml-auto p-2 text-ink-700 transition hover:text-ink-900 sm:ml-0 lg:hidden"
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-200 bg-white lg:hidden">
          <nav aria-label="Sections" className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="kicker block border-b border-ink-200 py-3.5 text-ink-600 transition hover:text-ink-900"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/login"
              className="kicker mt-5 flex items-center justify-center gap-2 border border-brand-600 bg-brand-600 px-4 py-3 text-white"
            >
              Sign in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
