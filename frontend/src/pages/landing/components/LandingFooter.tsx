import { LoginButtons } from '@/pages/landing/components/LoginButtons';
import { COLLEGE, DEPARTMENTS, FOOTER_LINKS } from '@/pages/landing/landingData';

const SOCIALS = ['Facebook', 'Instagram', 'LinkedIn', 'YouTube'];

export function LandingFooter() {
  return (
    <footer className="relative isolate overflow-hidden bg-brand-950 text-brand-200">
      <div aria-hidden="true" className="drafting absolute inset-0 -z-10 opacity-60" />

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-4">
        <div>
          <div className="flex items-baseline gap-2.5 text-white">
            <span className="font-serif text-xl">{COLLEGE.short}</span>
            <span className="kicker text-brand-300">Est. {COLLEGE.established}</span>
          </div>
          <p className="mt-5 font-serif text-lg text-white">{COLLEGE.name}</p>
          <ul className="mt-4 space-y-1.5">
            {COLLEGE.accreditations.map((item) => (
              <li key={item} className="kicker flex items-center gap-2">
                <span aria-hidden="true" className="size-1 bg-brand-400" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-relaxed">{COLLEGE.address}</p>
          <p className="mt-3 text-sm">{COLLEGE.phone}</p>
          <p className="text-sm">{COLLEGE.email}</p>
        </div>

        {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
          <div key={heading}>
            <p className="kicker border-b border-white/15 pb-3 text-white">{heading}</p>
            <ul>
              {links.map((link) => (
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
        ))}

        <div>
          <p className="kicker border-b border-white/15 pb-3 text-white">Departments</p>
          <ul>
            {DEPARTMENTS.slice(0, 4).map((department) => (
              <li key={department.code}>
                <a
                  href="#departments"
                  className="block border-b border-white/10 py-3 text-sm transition hover:text-white"
                >
                  {department.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-8 gap-y-4 px-4 py-6 sm:px-6">
          <p className="kicker text-white">Portal access</p>
          <LoginButtons variant="onDark" />
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="kicker">
            © {new Date().getFullYear()} {COLLEGE.short} — all rights reserved
          </p>
          <ul className="flex flex-wrap gap-6">
            {SOCIALS.map((social) => (
              <li key={social}>
                <a href="#top" className="kicker transition hover:text-white">
                  {social}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
