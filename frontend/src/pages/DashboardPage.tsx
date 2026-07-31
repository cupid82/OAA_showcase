import { Link } from 'react-router-dom';

import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import { NAV_BY_ROLE, ROLE_LABEL } from '@/lib/nav';

const INTRO: Record<string, string> = {
  student: 'Your academic record, ability profile and campus activity.',
  teacher: 'Your classes, attendance entry, marks and student assessments.',
  admin: 'Institution-wide records, academics and configuration.',
};

/**
 * Left hairline and its padding, per index — one column, two from sm, three from
 * xl. The pattern repeats every six cells, so the first cell of every row stays
 * flush with the page grid at every width.
 */
const CELL = [
  '',
  'sm:border-l sm:pl-6 xl:border-l xl:pl-6',
  'xl:border-l xl:pl-6',
  'sm:border-l sm:pl-6 xl:border-l-0 xl:pl-0',
  'xl:border-l xl:pl-6',
  'sm:border-l sm:pl-6 xl:border-l xl:pl-6',
];

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

      <div className="mb-10 flex items-start gap-3 border-l-2 border-accent-500 bg-accent-400/10 px-4 py-3.5">
        <Icon name="sparkle" className="mt-0.5 size-5 shrink-0 text-accent-600" />
        <div className="text-sm">
          <p className="kicker text-ink-800">Shell only — no data yet</p>
          <p className="mt-1.5 text-ink-600">
            Signed in as {ROLE_LABEL[user.role]} through the mock provider. The database and auth
            API are Steps 1 and 2 of the build plan; every module below is routed and waiting for
            its step.
          </p>
        </div>
      </div>

      <div className="grid border-t border-ink-300 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((item, index) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'group flex flex-col border-b border-ink-300 py-6 pr-6 transition hover:bg-white',
              CELL[index % CELL.length],
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <Icon
                name={item.icon}
                className="size-6 text-ink-400 transition group-hover:text-brand-600"
              />
              {item.step && <span className="kicker text-ink-400">Step {item.step}</span>}
            </div>
            <p className="mt-4 font-serif text-xl text-ink-900">{item.label}</p>
            <p className="mt-2 flex-1 text-sm text-ink-600">{item.blurb}</p>
            <span className="kicker mt-5 flex items-center gap-2 text-brand-700">
              Open
              <span
                aria-hidden="true"
                className="h-px w-6 bg-brand-400 transition-all group-hover:w-10"
              />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
