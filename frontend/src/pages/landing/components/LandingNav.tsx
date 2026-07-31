import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/ui/Icon';
import { LoginButtons } from '@/pages/landing/components/LoginButtons';
import { COLLEGE, NAV_LINKS } from '@/pages/landing/landingData';

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-ink-900">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon name="cap" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm sm:text-base">{COLLEGE.short}</span>
            <span className="block text-[11px] font-normal text-ink-500">
              Est. {COLLEGE.established}
            </span>
          </span>
        </Link>

        <nav aria-label="Sections" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
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
          className="ml-auto rounded-lg p-2 text-ink-700 transition hover:bg-ink-100 lg:hidden"
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-200 bg-white lg:hidden">
          <nav aria-label="Sections" className="mx-auto flex w-full max-w-6xl flex-col p-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-ink-100"
              >
                {link.label}
              </a>
            ))}
            <LoginButtons className="mt-3" onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}
    </header>
  );
}
