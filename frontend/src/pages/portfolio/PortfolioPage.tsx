import { Link, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { ExternalLink, SectionHeading, SkillChips } from '@/components/ui/Bits';
import { Icon } from '@/components/ui/Icon';
import { Loading } from '@/components/ui/Loading';
import { cn } from '@/lib/cn';
import { formatDate, initialsOf, yearLabel } from '@/lib/format';
import { OUTCOME_LABEL } from '@/lib/labels';
import { useApi } from '@/lib/useApi';
import { COLLEGE } from '@/pages/landing/landingData';
import type { Portfolio } from '@/types';

/**
 * A student's public page — the one part of OAA anyone can open, and something
 * worth sending a recruiter. Only what the student switched on appears here.
 */
export default function PortfolioPage() {
  const { handle = '' } = useParams();
  const { data, error, loading } = useApi<Portfolio>(
    `/api/portfolio/${encodeURIComponent(handle)}`,
  );

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-baseline gap-2.5">
            <span className="font-serif text-xl leading-none text-ink-900">OAA</span>
            <span className="kicker text-ink-400">Portfolio</span>
          </Link>
          <span className="kicker hidden text-ink-400 sm:inline">{COLLEGE.name}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        {loading && <Loading variant="page" />}

        {error && (
          <div className="py-24 text-center">
            <p className="kicker text-brand-700">Nothing here</p>
            <h1 className="mt-3 font-serif text-4xl text-ink-900">
              No public portfolio at this address
            </h1>
            <p className="mx-auto mt-3 max-w-md text-ink-600">
              Either the address is wrong, or its owner hasn’t made their portfolio public.
            </p>
          </div>
        )}

        {data && <Body data={data} />}
      </main>

      <footer className="border-t border-ink-200">
        <p className="kicker mx-auto w-full max-w-5xl px-4 py-6 text-ink-400 sm:px-6">
          Shared from OAA — skills here are shown only where the student’s own work backs them up.
        </p>
      </footer>
    </div>
  );
}

function Body({ data }: { data: Portfolio }) {
  return (
    <>
      <section className="grid gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
        <span
          aria-hidden="true"
          className="flex size-24 items-center justify-center border border-ink-900 bg-ink-900 font-serif text-4xl text-ink-50"
        >
          {initialsOf(data.name)}
        </span>
        <div>
          <h1 className="font-serif text-5xl text-ink-900">{data.name}</h1>
          {data.headline && <p className="mt-3 text-xl text-ink-700">{data.headline}</p>}
          <p className="mt-3 text-sm text-ink-500">
            {data.department} · {yearLabel(data.year)}
            {data.track && ` · Working towards ${data.track}`}
          </p>
          {data.bio && (
            <p className="prose-measure mt-5 leading-relaxed text-ink-700">{data.bio}</p>
          )}
          {data.links.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {data.links.map((link) => (
                <li key={link.provider}>
                  <ExternalLink href={link.url}>{link.label}</ExternalLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {data.skills.length > 0 && (
        <section className="mt-16">
          <SectionHeading
            title="Skills, backed by work"
            note="Proven: shipped or certified · Practising: in progress"
          />
          <ul className="flex flex-wrap gap-2">
            {data.skills.map((skill) => (
              <li
                key={skill.id}
                className={cn(
                  'flex items-center gap-2 border px-3 py-1.5 text-sm',
                  skill.stage === 'proven'
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-brand-300 bg-brand-50 text-brand-900',
                )}
              >
                {skill.stage === 'proven' && <Icon name="check" className="size-3.5" />}
                {skill.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16">
        <SectionHeading title="Projects" />
        {data.projects.length === 0 ? (
          <p className="text-sm text-ink-500">No public projects yet.</p>
        ) : (
          <ul className="space-y-6">
            {data.projects.map((project) => (
              <li key={project.id} className="border border-ink-300 bg-white px-6 py-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={project.status === 'shipped' ? 'solid' : 'brand'}>
                    {project.status === 'shipped'
                      ? `Shipped${project.shippedAt ? ` ${formatDate(project.shippedAt, true)}` : ''}`
                      : 'In progress'}
                  </Badge>
                  {project.team > 1 && <Badge tone="muted">Team of {project.team}</Badge>}
                </div>
                <h2 className="mt-3 font-serif text-3xl text-ink-900">{project.title}</h2>
                {project.tagline && <p className="mt-1 text-ink-600">{project.tagline}</p>}
                <dl className="mt-5 grid gap-5 md:grid-cols-3">
                  {project.problem && <Story label="The problem">{project.problem}</Story>}
                  {project.role && <Story label="What they did">{project.role}</Story>}
                  {project.outcome && <Story label="What happened">{project.outcome}</Story>}
                </dl>
                <SkillChips skills={project.skills} link={false} className="mt-5" />
                {(project.repoUrl || project.demoUrl) && (
                  <p className="mt-4 flex flex-wrap gap-5 text-sm">
                    {project.repoUrl && (
                      <ExternalLink href={project.repoUrl}>Repository</ExternalLink>
                    )}
                    {project.demoUrl && (
                      <ExternalLink href={project.demoUrl}>Live demo</ExternalLink>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {(data.achievements.length > 0 || data.certificates.length > 0) && (
        <section className="mt-16 grid gap-12 md:grid-cols-2">
          {data.achievements.length > 0 && (
            <div>
              <SectionHeading title="Achievements" />
              <ul>
                {data.achievements.map((achievement) => (
                  <li
                    key={`${achievement.title}-${achievement.date}`}
                    className="flex items-start gap-3 border-b border-ink-200 py-3"
                  >
                    <Icon name="award" className="mt-0.5 size-5 text-brand-600" />
                    <div>
                      <p className="text-ink-900">
                        {OUTCOME_LABEL[achievement.outcome]} — {achievement.title}
                      </p>
                      <p className="text-xs text-ink-500">
                        {achievement.organiser} · {formatDate(achievement.date, true)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.certificates.length > 0 && (
            <div>
              <SectionHeading title="Certificates" />
              <ul>
                {data.certificates.map((certificate) => (
                  <li
                    key={`${certificate.title}-${certificate.issuedOn}`}
                    className="border-b border-ink-200 py-3"
                  >
                    <p className="text-ink-900">
                      {certificate.url ? (
                        <ExternalLink href={certificate.url}>{certificate.title}</ExternalLink>
                      ) : (
                        certificate.title
                      )}
                    </p>
                    <p className="text-xs text-ink-500">
                      {certificate.issuer} · {formatDate(certificate.issuedOn, true)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function Story({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <dt className="kicker text-ink-500">{label}</dt>
      <dd className="mt-1.5 text-sm leading-relaxed text-ink-800">{children}</dd>
    </div>
  );
}
