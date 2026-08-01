import type { ReactNode } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { useApi } from '@/lib/useApi';
import type { StudentProfile } from '@/types';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** `2004-07-14` → `14 July 2004`, without pulling in a date library. */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  const name = MONTHS[Number(month) - 1];
  if (!year || !day || !name) return iso;
  return `${Number(day)} ${name} ${year}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

const ORDINAL = ['', 'First', 'Second', 'Third', 'Fourth'];

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-t border-ink-200 py-3.5">
      <dt className="kicker text-ink-500">{label}</dt>
      <dd className="mt-1.5 text-ink-900">{value}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="font-serif text-xl text-ink-900">{title}</h2>
      <dl className="mt-4">{children}</dl>
    </section>
  );
}

export default function ProfilePage() {
  const { data, error, loading, reload } = useApi<StudentProfile>('/api/students/me');

  if (loading) return <Loading variant="page" label="Loading your profile…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) {
    return (
      <EmptyState
        title="No profile on record"
        description="Your account is not linked to a student record yet. Contact the college office."
      />
    );
  }

  return (
    <>
      <PageHeader title="Profile" description="Your personal and academic details on record." />

      <div className="mb-10 flex flex-wrap items-center gap-5 border border-ink-300 bg-white p-6">
        <span
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center border border-brand-200 bg-brand-50 font-serif text-2xl text-brand-700"
        >
          {initials(data.name)}
        </span>
        <div className="min-w-0">
          <p className="font-serif text-2xl text-ink-900">{data.name}</p>
          <p className="mt-1 font-mono text-sm text-ink-600">{data.rollNo}</p>
          <p className="mt-2 text-sm text-ink-600">
            {data.department} · Section {data.section}
          </p>
        </div>
      </div>

      <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
        <Group title="Academic">
          <Field label="Roll number" value={<span className="font-mono">{data.rollNo}</span>} />
          <Field label="Department" value={data.department} />
          <Field
            label="Year / semester"
            value={`${ORDINAL[data.year] ?? data.year} year · Semester ${data.semester}`}
          />
          <Field label="Section" value={data.section} />
          <Field label="Admission year" value={data.admissionYear} />
        </Group>

        <Group title="Personal">
          <Field label="Date of birth" value={formatDate(data.dob)} />
          <Field label="Gender" value={data.gender} />
          <Field label="Blood group" value={data.bloodGroup} />
        </Group>

        <Group title="Contact">
          <Field
            label="Email"
            value={
              <a
                className="underline underline-offset-4 hover:text-brand-700"
                href={`mailto:${data.email}`}
              >
                {data.email}
              </a>
            }
          />
          <Field label="Phone" value={data.phone} />
          <Field label="Address" value={data.address} />
        </Group>

        <Group title="Guardian">
          <Field label="Name" value={data.guardianName} />
          <Field label="Phone" value={data.guardianPhone} />
        </Group>
      </div>

      <p className="mt-10 border-t border-ink-300 pt-5 text-sm text-ink-500">
        These details are maintained by the college office. To correct anything here, raise a
        request with the administration — students cannot edit their own record.
      </p>
    </>
  );
}
