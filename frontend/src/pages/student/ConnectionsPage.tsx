import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { ExternalLink, SectionHeading, SkillChips } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Checkbox, Select, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProviderMark } from '@/components/ui/ProviderMark';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, plural, timeAgo } from '@/lib/format';
import { useAction } from '@/lib/useAction';
import { useApi } from '@/lib/useApi';
import type { ImportableRepo, ProviderView } from '@/types';

export default function ConnectionsPage() {
  const { data, error, loading, reload, setData } = useApi<ProviderView[]>('/api/connections');
  const [notice, setNotice] = useState<string | null>(null);

  const write = useAction(
    async (request: () => Promise<{ data: ProviderView[] }>, message: string) => {
      const { data: next } = await request();
      setData(next);
      setNotice(message);
      return true as const;
    },
  );

  if (loading && !data) return <Loading variant="page" />;
  if (error && !data) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return null;

  const github = data.find((provider) => provider.id === 'github');
  const others = data.filter((provider) => provider.id !== 'github');

  return (
    <>
      <PageHeader
        eyebrow="Connected apps"
        title="Bring your work with you"
        description="Link the accounts you already use. GitHub syncs your public repositories so you can import them as projects; the others become links you choose whether to show on your portfolio. Nothing is linked without your consent, and nothing is fetched until you press sync."
      />

      <div className="mb-8 space-y-3">
        {notice && (
          <Notice tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Notice>
        )}
        {write.error && <ErrorMessage message={write.error} />}
      </div>

      {github && (
        <GithubCard
          provider={github}
          run={write.run}
          pending={write.pending}
          onNotice={setNotice}
        />
      )}

      <section aria-labelledby="links-heading" className="mt-14">
        <SectionHeading
          id="links-heading"
          title="Profile links"
          note="Shown on your portfolio only if you say so"
        />
        <ul className="grid gap-4 md:grid-cols-2">
          {others.map((provider) => (
            <li key={provider.id}>
              <LinkCard provider={provider} run={write.run} pending={write.pending} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

type Run = (
  request: () => Promise<{ data: ProviderView[] }>,
  message: string,
) => Promise<true | undefined>;

function ConnectForm({
  provider,
  run,
  pending,
  onDone,
}: {
  provider: ProviderView;
  run: Run;
  pending: boolean;
  onDone?: () => void;
}) {
  const [handle, setHandle] = useState('');
  const [show, setShow] = useState(true);
  const [consent, setConsent] = useState(false);
  const sync = provider.kind === 'sync';

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const ok = await run(
          () =>
            api.put(`/api/connections/${provider.id}`, { handle, showOnPortfolio: show, consent }),
          sync
            ? `${provider.name} linked. Press “Sync now” to read your public repositories.`
            : `${provider.name} linked.`,
        );
        if (ok) onDone?.();
      }}
    >
      <div>
        <label htmlFor={`handle-${provider.id}`} className="kicker block text-ink-500">
          {provider.id === 'website' ? 'Address' : 'Username or profile link'}
        </label>
        <TextInput
          id={`handle-${provider.id}`}
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          placeholder={provider.placeholder}
          required
          autoComplete="off"
        />
      </div>
      <Checkbox
        id={`show-${provider.id}`}
        checked={show}
        onChange={setShow}
        label="Show it on my public portfolio"
      />
      <Checkbox
        id={`consent-${provider.id}`}
        checked={consent}
        onChange={setConsent}
        label="Yes, link this account to my OAA profile"
        description={
          sync
            ? 'OAA will read your public GitHub profile and repositories — only when you press Sync, never in the background, never anything private.'
            : 'OAA stores the link. It never logs in to or reads from this service.'
        }
      />
      <Button type="submit" size="sm" disabled={pending || !consent || handle.trim() === ''}>
        Link {provider.name}
      </Button>
    </form>
  );
}

function LinkCard({
  provider,
  run,
  pending,
}: {
  provider: ProviderView;
  run: Run;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const connection = provider.connection;

  return (
    <div className="flex h-full flex-col border border-ink-300 bg-white px-5 py-5">
      <div className="flex items-start gap-4">
        <ProviderMark provider={provider.id} connected={connection !== null} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-serif text-xl text-ink-900">{provider.name}</p>
            {connection && <Badge tone="brand">Linked</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-600">{provider.blurb}</p>
        </div>
      </div>

      {connection ? (
        <div className="mt-4 space-y-3 border-t border-ink-200 pt-4 text-sm">
          <ExternalLink href={connection.url}>{connection.handle}</ExternalLink>
          <Checkbox
            id={`toggle-${provider.id}`}
            checked={connection.showOnPortfolio}
            disabled={pending}
            onChange={(checked) =>
              void run(
                () => api.patch(`/api/connections/${provider.id}`, { showOnPortfolio: checked }),
                checked ? 'It will show on your portfolio.' : 'Hidden from your portfolio.',
              )
            }
            label="Show on my portfolio"
          />
          <ConfirmButton
            confirmLabel="Unlink?"
            onConfirm={() =>
              void run(
                () => api.delete(`/api/connections/${provider.id}`),
                `${provider.name} unlinked.`,
              )
            }
          >
            Unlink
          </ConfirmButton>
        </div>
      ) : open ? (
        <ConnectForm
          provider={provider}
          run={run}
          pending={pending}
          onDone={() => setOpen(false)}
        />
      ) : (
        <Button
          size="sm"
          variant="secondary"
          className="mt-4 self-start"
          onClick={() => setOpen(true)}
        >
          <Icon name="link" className="size-4" />
          Link
        </Button>
      )}
    </div>
  );
}

function GithubCard({
  provider,
  run,
  pending,
  onNotice,
}: {
  provider: ProviderView;
  run: Run;
  pending: boolean;
  onNotice: (message: string) => void;
}) {
  const connection = provider.connection;
  const summary = connection?.github ?? null;

  const addSkill = useAction(async (skillId: string, name: string) => {
    await api.post('/api/skills', { skillId, level: 'intermediate' });
    onNotice(`${name} added to your skills at intermediate — adjust it on the Skills page.`);
  });

  return (
    <section
      id="github"
      aria-labelledby="github-heading"
      className="scroll-mt-24 border border-ink-900 bg-white"
    >
      <div className="flex flex-wrap items-start gap-5 border-b border-ink-200 px-6 py-6">
        <ProviderMark
          provider="github"
          connected={connection !== null}
          className="size-14 text-base"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="github-heading" className="font-serif text-3xl text-ink-900">
              GitHub
            </h2>
            <Badge tone={connection ? 'brand' : 'muted'}>
              {connection ? 'Linked' : 'Not linked'}
            </Badge>
            <Badge tone="muted">Syncs</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">{provider.blurb}</p>
        </div>
      </div>

      <div className="px-6 py-6">
        {!connection ? (
          <div className="max-w-xl">
            <ConnectForm provider={provider} run={run} pending={pending} />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm">
                <ExternalLink href={connection.url}>github.com/{connection.handle}</ExternalLink>
                <p className="mt-1 text-xs text-ink-500">
                  {connection.lastSyncedAt
                    ? `Last synced ${timeAgo(connection.lastSyncedAt)}`
                    : 'Not synced yet'}{' '}
                  · linked {formatDate(connection.consentAt, true)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    void run(
                      () => api.post('/api/connections/github/sync', {}),
                      'Synced with GitHub.',
                    )
                  }
                >
                  <Icon name="refresh" className="size-4" />
                  {pending ? 'Syncing…' : 'Sync now'}
                </Button>
                <ConfirmButton
                  confirmLabel="Unlink GitHub?"
                  onConfirm={() =>
                    void run(
                      () => api.delete('/api/connections/github'),
                      'GitHub unlinked. Imported projects stay yours.',
                    )
                  }
                >
                  Unlink
                </ConfirmButton>
              </div>
            </div>

            {connection.syncError && (
              <Notice tone="warning" title="The last sync didn’t work" className="mt-5">
                {connection.syncError}
              </Notice>
            )}

            <Checkbox
              id="github-show"
              className="mt-5"
              checked={connection.showOnPortfolio}
              disabled={pending}
              onChange={(checked) =>
                void run(
                  () => api.patch('/api/connections/github', { showOnPortfolio: checked }),
                  checked ? 'GitHub will show on your portfolio.' : 'Hidden from your portfolio.',
                )
              }
              label="Show my GitHub on my portfolio"
            />

            {summary && (
              <>
                <dl className="mt-6 grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-3">
                  <div className="bg-white px-4 py-4">
                    <dt className="kicker text-ink-500">Public repositories</dt>
                    <dd className="mt-1.5 font-serif text-3xl text-ink-900">
                      {summary.publicRepos}
                    </dd>
                  </div>
                  <div className="bg-white px-4 py-4">
                    <dt className="kicker text-ink-500">Followers</dt>
                    <dd className="mt-1.5 font-serif text-3xl text-ink-900">{summary.followers}</dd>
                  </div>
                  <div className="bg-white px-4 py-4">
                    <dt className="kicker text-ink-500">Not imported yet</dt>
                    <dd className="mt-1.5 font-serif text-3xl text-ink-900">
                      {summary.importable}
                    </dd>
                  </div>
                </dl>

                {summary.topLanguages.length > 0 && (
                  <div className="mt-6">
                    <p className="kicker text-ink-500">Languages across your own repositories</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {summary.topLanguages.map((entry) => (
                        <li
                          key={entry.language}
                          className="border border-ink-300 bg-ink-50 px-2 py-0.5 text-xs text-ink-700"
                        >
                          {entry.language} <span className="text-ink-400">· {entry.repos}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.skillHints.length > 0 && (
                  <div className="mt-6 border-l-2 border-brand-400 pl-4">
                    <p className="text-sm text-ink-800">
                      Your repositories use skills you haven’t listed:
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {summary.skillHints.map((hint) => (
                        <li key={hint.skill.id}>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={addSkill.pending}
                            onClick={() => void addSkill.run(hint.skill.id, hint.skill.name)}
                          >
                            <Icon name="plus" className="size-3.5" />
                            {hint.skill.name}{' '}
                            <span className="text-ink-400">({plural(hint.repos, 'repo')})</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                    {addSkill.error && (
                      <p className="mt-2 text-sm text-red-700">{addSkill.error}</p>
                    )}
                  </div>
                )}

                <RepoImport syncedAt={connection.lastSyncedAt} onImported={onNotice} />
              </>
            )}

            {!summary && !connection.syncError && (
              <p className="mt-6 text-sm text-ink-600">
                Press “Sync now” to read your public repositories. It takes a second or two.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function RepoImport({
  syncedAt,
  onImported,
}: {
  syncedAt: string | null;
  onImported: (message: string) => void;
}) {
  const { data, error, loading, reload } = useApi<{
    syncedAt: string | null;
    repos: ImportableRepo[];
  }>(`/api/connections/github/repos?at=${encodeURIComponent(syncedAt ?? '')}`);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'shipped' | 'building'>('shipped');
  const [visibility, setVisibility] = useState<'private' | 'campus' | 'public'>('private');
  const [showForks, setShowForks] = useState(false);

  useEffect(() => {
    setSelected(new Set());
  }, [syncedAt]);

  const repos = useMemo(
    () => (data?.repos ?? []).filter((repo) => showForks || !repo.fork),
    [data, showForks],
  );

  const importRepos = useAction(async () => {
    const { data: result } = await api.post<{ data: { imported: string[] } }>(
      '/api/connections/github/import',
      {
        repos: [...selected],
        status,
        visibility,
      },
    );
    setSelected(new Set());
    reload();
    onImported(
      `Imported ${plural(result.imported.length, 'project')}. Give each a problem statement so it counts as proof.`,
    );
  });

  if (loading && !data) return <Loading label="Listing repositories…" />;
  if (error) return <ErrorMessage className="mt-6" message={error} onRetry={reload} />;
  if (!data || data.repos.length === 0)
    return <p className="mt-6 text-sm text-ink-500">No public repositories found.</p>;

  const toggle = (name: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div className="mt-10">
      <SectionHeading
        title="Import repositories as projects"
        note={
          <Checkbox
            id="show-forks"
            checked={showForks}
            onChange={setShowForks}
            label="Show forks"
          />
        }
      />
      <ul className="max-h-[28rem] overflow-y-auto border-t border-ink-200">
        {repos.map((repo) => {
          const checked = selected.has(repo.fullName);
          return (
            <li
              key={repo.fullName}
              className={cn(
                'flex items-start gap-3 border-b border-ink-200 py-3',
                repo.importedAs && 'opacity-70',
              )}
            >
              <input
                type="checkbox"
                aria-label={`Import ${repo.name}`}
                checked={checked}
                disabled={repo.importedAs !== null}
                onChange={() => toggle(repo.fullName)}
                className="mt-1 size-4 shrink-0 cursor-pointer accent-brand-600 disabled:cursor-not-allowed"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ExternalLink href={repo.htmlUrl} className="text-sm">
                    {repo.name}
                  </ExternalLink>
                  {repo.fork && <Badge tone="muted">Fork</Badge>}
                  {repo.archived && <Badge tone="muted">Archived</Badge>}
                  {repo.language && <span className="text-xs text-ink-500">{repo.language}</span>}
                  {repo.stars > 0 && <span className="text-xs text-ink-500">★ {repo.stars}</span>}
                </div>
                {repo.description && (
                  <p className="mt-0.5 text-xs text-ink-600">{repo.description}</p>
                )}
                <SkillChips skills={repo.skills} link={false} className="mt-1.5" />
              </div>
              {repo.importedAs && (
                <Link
                  to={`/student/projects/${repo.importedAs}`}
                  className="kicker shrink-0 text-brand-700"
                >
                  Imported
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 grid gap-5 sm:grid-cols-[12rem_12rem_auto] sm:items-end">
        <div>
          <label htmlFor="import-status" className="kicker block text-ink-500">
            Import as
          </label>
          <Select
            id="import-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as 'shipped' | 'building')}
          >
            <option value="shipped">Shipped</option>
            <option value="building">Still building</option>
          </Select>
        </div>
        <div>
          <label htmlFor="import-visibility" className="kicker block text-ink-500">
            Visible to
          </label>
          <Select
            id="import-visibility"
            value={visibility}
            onChange={(event) =>
              setVisibility(event.target.value as 'private' | 'campus' | 'public')
            }
          >
            <option value="private">Only me</option>
            <option value="campus">Campus</option>
            <option value="public">Public portfolio</option>
          </Select>
        </div>
        <Button
          disabled={importRepos.pending || selected.size === 0}
          onClick={() => void importRepos.run()}
        >
          <Icon name="download" className="size-4" />
          Import {selected.size > 0 ? selected.size : ''}
        </Button>
      </div>
      {importRepos.error && <ErrorMessage className="mt-4" message={importRepos.error} />}
      <p className="mt-3 text-xs text-ink-500">
        Imported projects start without a problem statement — they earn nothing until you tell their
        story. The skills are guessed from each repository’s language and topics; change them on the
        project.
      </p>
    </div>
  );
}
