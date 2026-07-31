import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/ui/Icon';
import { LoginButtons } from '@/pages/landing/components/LoginButtons';
import { COLLEGE, NAV_LINKS } from '@/pages/landing/landingData';

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/92 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center bg-ink-900 text-white">
            <Icon name="cap" className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-lg text-ink-900">{COLLEGE.short}</span>
            <span className="kicker block text-ink-500">Est. {COLLEGE.established}</span>
          </span>
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

        <div className="ml-auto hidden lg:block">
          <LoginButtons />
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="ml-auto p-2 text-ink-700 transition hover:text-ink-900 lg:hidden"
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
            <LoginButtons className="mt-5" onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}
    </header>
  );
}
