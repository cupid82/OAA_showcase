import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { api } from '@/lib/api';
import { formatDate, timeAgo } from '@/lib/format';
import { EVENT_TYPE_LABEL, JOB_KIND_LABEL } from '@/lib/labels';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import type { ListingRow, ListingStatus } from '@/types';
import { SourceBadge } from '@/pages/student/opportunities/shared';

const STATUSES: ListingStatus[] = ['pending', 'published', 'rejected', 'archived'];
const STATUS_LABEL: Record<ListingStatus, string> = {
  pending: 'Waiting for review',
  published: 'Live',
  rejected: 'Turned down',
  archived: 'Archived',
};

/** Events or jobs — one list, one review queue, the same actions. */
export default function ListingsPage({ kind }: { kind: 'event' | 'job' }) {
  const plural = kind === 'event' ? 'events' : 'jobs';
  const [params, setParams] = useSearchParams();
  const all = useApi<ListingRow[]>(`/api/admin/${plural}`);
  const requested = STATUSES.find((status) => status === params.get('status'));
  const hasPending = (all.data ?? []).some((row) => row.status === 'pending');
  const status: ListingStatus = requested ?? (hasPending ? 'pending' : 'published');
  const [notice, setNotice] = useState<string | null>(null);

  const review = useAction(
    async (row: ListingRow, decision: string, note: string, message: string) => {
      await api.post(`/api/admin/${plural}/${row.id}/review`, { decision, note });
      setNotice(message);
      all.reload();
      return true as const;
    },
  );

  if (all.loading && !all.data) return <Loading variant="page" />;
  if (all.error && !all.data) return <ErrorMessage message={all.error} onRetry={all.reload} />;
  if (!all.data) return null;

  const rows = all.data.filter((row) => row.status === status);
  const count = (value: ListingStatus) =>
    all.data?.filter((row) => row.status === value).length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Moderation"
        title={kind === 'event' ? 'Events' : 'Jobs & openings'}
        description={
          kind === 'event'
            ? 'Publish events, and check the ones students share before anyone else sees them.'
            : 'Publish openings, and check the ones students share before anyone else sees them.'
        }
        actions={
          <ButtonLink to={`/admin/${plural}/new`}>
            <Icon name="plus" className="size-4" />
            {kind === 'event' ? 'New event' : 'New opening'}
          </ButtonLink>
        }
      />

      <div className="mb-6 space-y-3">
        {notice && (
          <Notice tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Notice>
        )}
        {review.error && <ErrorMessage message={review.error} />}
      </div>

      <Tabs
        label="Status"
        value={status}
        onChange={(value) => setParams({ status: value }, { replace: true })}
        tabs={STATUSES.map((value) => ({ value, label: STATUS_LABEL[value], count: count(value) }))}
      />

      {rows.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Nothing here"
          description={
            status === 'pending'
              ? 'No student shares waiting. Nice.'
              : 'No listings with this status.'
          }
        />
      ) : (
        <ul className="mt-6">
          {rows.map((row) => (
            <Row key={row.id} row={row} kind={kind} run={review.run} pending={review.pending} />
          ))}
        </ul>
      )}
    </>
  );
}

function Row({
  row,
  kind,
  run,
  pending,
}: {
  row: ListingRow;
  kind: 'event' | 'job';
  run: (
    row: ListingRow,
    decision: string,
    note: string,
    message: string,
  ) => Promise<true | undefined>;
  pending: boolean;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const plural = kind === 'event' ? 'events' : 'jobs';
  const category =
    kind === 'event'
      ? (EVENT_TYPE_LABEL as Record<string, string>)[row.category]
      : (JOB_KIND_LABEL as Record<string, string>)[row.category];

  return (
    <li className="border-b border-ink-200 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{category ?? row.category}</Badge>
            <SourceBadge verification={row.verification} label={row.verificationLabel} />
            {row.sharedBy && <Badge tone="muted">Shared by {row.sharedBy}</Badge>}
          </div>
          <h3 className="mt-2.5 font-serif text-xl text-ink-900">{row.title}</h3>
          <p className="mt-1 text-sm text-ink-500">
            {row.organiser}
            {row.date && ` · ${kind === 'event' ? 'on' : 'closes'} ${formatDate(row.date, true)}`} ·
            added {timeAgo(row.createdAt)} · {row.interest}{' '}
            {kind === 'event' ? 'in students’ lists' : 'tracking it'}
          </p>
          {row.status === 'rejected' && row.reviewNote && (
            <p className="mt-2 text-sm text-ink-600">
              <span className="kicker mr-2 text-ink-500">Note sent</span>
              {row.reviewNote}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <ButtonLink to={`/admin/${plural}/${row.id}/edit`} variant="secondary" size="sm">
            {row.status === 'pending' ? 'Check & edit' : 'Edit'}
          </ButtonLink>
          {(row.status === 'pending' || row.status === 'rejected') && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                void run(
                  row,
                  'approve',
                  '',
                  `“${row.title}” is live. The student who shared it has been told.`,
                )
              }
            >
              <Icon name="check" className="size-4" />
              Approve
            </Button>
          )}
          {row.status === 'pending' && !rejecting && (
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => setRejecting(true)}
            >
              Turn down
            </Button>
          )}
          {row.status === 'published' && (
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => void run(row, 'archive', '', `“${row.title}” archived.`)}
            >
              Archive
            </Button>
          )}
          {row.status === 'archived' && (
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => void run(row, 'restore', '', `“${row.title}” is live again.`)}
            >
              Restore
            </Button>
          )}
        </div>
      </div>

      {rejecting && (
        <form
          className="mt-4 grid gap-3 border border-ink-300 bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await run(
              row,
              'reject',
              note,
              'Turned down. Your note was sent to the student.',
            );
            if (ok) setRejecting(false);
          }}
        >
          <div>
            <label htmlFor={`note-${row.id}`} className="kicker block text-ink-500">
              Why? The student sees this.
            </label>
            <TextInput
              id={`note-${row.id}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              required
              maxLength={300}
              placeholder="The link goes to a page asking for a registration fee."
            />
          </div>
          <Button type="submit" size="sm" variant="danger" disabled={pending || note.trim() === ''}>
            Turn down
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRejecting(false)}>
            Cancel
          </Button>
        </form>
      )}
      {row.status === 'pending' && row.sharedBy && (
        <p className="mt-3 text-xs text-ink-500">
          Before approving: open the source link from the edit page, and check it isn’t asking
          students for money or passwords.{' '}
          <Link
            to={`/admin/${plural}/${row.id}/edit`}
            className="text-brand-700 underline underline-offset-4"
          >
            Open it
          </Link>
        </p>
      )}
    </li>
  );
}
