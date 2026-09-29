import { Link } from 'react-router-dom';

import { useMeta } from '@/lib/useShared';
import { COLLEGE, NAV_LINKS, PROMISE } from '@/pages/landing/landingData';

export function LandingFooter() {
  const meta = useMeta();

  return (
    <footer className="relative isolate overflow-hidden bg-brand-950 text-brand-200">
      <div aria-hidden="true" className="drafting absolute inset-0 -z-10 opacity-60" />

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-baseline gap-2.5 text-white">
            <span className="font-serif text-3xl leading-none">OAA</span>
            <span className="kicker text-brand-300">for {COLLEGE.short} students</span>
          </div>
          <p className="mt-5 max-w-sm font-serif text-lg leading-snug text-white">{PROMISE}</p>
          <p className="mt-4 text-sm">{COLLEGE.name}</p>
        </div>

        <div>
          <p className="kicker border-b border-white/15 pb-3 text-white">On this page</p>
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block border-b border-white/10 py-3 text-sm transition hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="kicker border-b border-white/15 pb-3 text-white">Elsewhere</p>
          <ul>
            <li>
              <Link
                to="/login"
                className="block border-b border-white/10 py-3 text-sm transition hover:text-white"
              >
                Sign in to OAA
              </Link>
            </li>
            {meta && (
              <li>
                <a
                  href={meta.erp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border-b border-white/10 py-3 text-sm transition hover:text-white"
                >
                  {meta.erp.name} — marks, attendance, fees ↗
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="kicker">
            © {new Date().getFullYear()} OAA · {COLLEGE.short}
          </p>
          <p className="kicker text-brand-300">Nothing here is public until you make it so</p>
        </div>
      </div>
    </footer>
  );
}
