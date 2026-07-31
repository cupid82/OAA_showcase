import { Link } from 'react-router-dom';

import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { NAV_BY_ROLE, ROLE_LABEL } from '@/lib/nav';

const INTRO: Record<string, string> = {
  student: 'Your academic record, ability profile and campus activity.',
  teacher: 'Your classes, attendance entry, marks and student assessments.',
  admin: 'Institution-wide records, academics and configuration.',
};

/**
 * One dashboard driven by the signed-in role. Steps 5, 6 and 9 replace this with
 * real per-role dashboards backed by data — until then it is a module index, not
 * a fake summary.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const modules = NAV_BY_ROLE[user.role].filter((item) => item.to !== `/${user.role}`);
  const firstName = user.name.replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={INTRO[user.role] ?? ROLE_LABEL[user.role]}
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-accent-400/40 bg-accent-400/10 p-4">
        <Icon name="sparkle" className="mt-0.5 size-5 text-accent-600" />
        <div className="text-sm">
          <p className="font-semibold text-ink-900">Shell only — no data yet</p>
          <p className="mt-0.5 text-ink-600">
            Signed in as <span className="font-medium">{ROLE_LABEL[user.role]}</span> through the
            mock provider. The database and auth API are Steps 1 and 2 of the build plan; every
            module below is routed and waiting for its step.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group rounded-xl border border-ink-200 bg-white p-5 shadow-card transition hover:border-brand-300 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon name={item.icon} />
              </span>
              {item.step && (
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-500">
                  Step {item.step}
                </span>
              )}
            </div>
            <p className="mt-3 font-semibold text-ink-900">{item.label}</p>
            <p className="mt-1 text-sm text-ink-500">{item.blurb}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
              Open
              <Icon name="arrowRight" className="size-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
