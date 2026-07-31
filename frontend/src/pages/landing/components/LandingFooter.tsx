import { Icon } from '@/components/ui/Icon';
import { LoginButtons } from '@/pages/landing/components/LoginButtons';
import { COLLEGE, DEPARTMENTS, FOOTER_LINKS } from '@/pages/landing/landingData';

const SOCIALS = ['Facebook', 'Instagram', 'LinkedIn', 'YouTube'];

export function LandingFooter() {
  return (
    <footer className="bg-ink-900 text-ink-300">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2 text-white">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600">
              <Icon name="cap" />
            </span>
            <span className="font-semibold">{COLLEGE.short}</span>
          </div>
          <p className="mt-4 text-sm">{COLLEGE.name}</p>
          <p className="mt-2 text-sm">{COLLEGE.address}</p>
          <p className="mt-2 text-sm">{COLLEGE.phone}</p>
          <p className="text-sm">{COLLEGE.email}</p>
        </div>

        {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
          <div key={heading}>
            <p className="text-sm font-semibold text-white">{heading}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="transition hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="text-sm font-semibold text-white">Departments</p>
          <ul className="mt-4 space-y-2 text-sm">
            {DEPARTMENTS.slice(0, 4).map((department) => (
              <li key={department.code}>
                <a href="#departments" className="transition hover:text-white">
                  {department.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-800">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <p className="text-sm font-semibold text-white">Portal access</p>
          <LoginButtons className="mt-3" />
        </div>
      </div>

      <div className="border-t border-ink-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {COLLEGE.name}. All rights reserved.
          </p>
          <ul className="flex gap-4">
            {SOCIALS.map((social) => (
              <li key={social}>
                <a href="#top" className="transition hover:text-white">
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
