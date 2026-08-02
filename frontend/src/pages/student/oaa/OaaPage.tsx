import type { ReactNode } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { criterionLabel } from '@/lib/oaaCriteria';
import { useApi } from '@/lib/useApi';
import type { ContributingRecord, OaaSummary } from '@/types';

import { AbilityRadar, MIN_RADAR_AXES } from './AbilityRadar';
import { ScoreGauge } from './ScoreGauge';
import { TrendChart } from './TrendChart';
import { COHORT, YOU } from './chartTokens';

function formatDate(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Section heading. Sans, small and quiet — the serif is spent on the figures and
 * the page title, so a heading that also shouted would leave nothing to rank
 * against.
 */
function SectionHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink-200 pb-3">
      <h2 className="font-serif text-lg text-ink-900">{title}</h2>
      {note && <p className="text-sm text-ink-500">{note}</p>}
    </div>
  );
}

/** One fact on the dark hero rail. */
function PlateFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="kicker text-ink-500">{label}</dt>
      <dd className="mt-1.5 text-sm text-ink-200">{children}</dd>
    </div>
  );
}

/**
 * Table column header. Deliberately *not* the `kicker`: that utility is the
 * brand's mono label, and when it also carries table headers, filter chips and
 * captions it stops marking anything out. Here a plain tracked sans is enough.
 */
const COL = 'text-[0.6875rem] font-semibold tracking-[0.07em] uppercase text-ink-500';

function RecordList({ records, empty }: { records: ContributingRecord[]; empty: string }) {
  if (records.length === 0) return <p className="mt-4 text-sm text-ink-500">{empty}</p>;

  return (
    <ul className="mt-3">
      {records.map((record, index) => (
        <li
          key={`${record.label}-${index}`}
          className="flex items-baseline justify-between gap-4 border-t border-ink-200 py-2.5 text-sm"
        >
          <span className="text-ink-800">{record.label}</span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-ink-500">
            +{record.points}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function OaaPage() {
  const { data, error, loading, reload } = useApi<OaaSummary>('/api/students/me/oaa');

  if (loading) return <Loading variant="page" label="Calculating your ability profile…" />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!data) return null;

  if (data.score === null) {
    return (
      <>
        <PageHeader
          eyebrow="Overall Ability Assessment"
          title="Your ability profile"
          description="Four dimensions, weighted into one score out of 100."
        />
        <EmptyState
          title="Nothing recorded yet"
          description="Your ability score appears once marks, assessments or activity records exist for this semester."
        />
      </>
    );
  }

  const measured = data.dimensions.filter((dimension) => dimension.value !== null);
  const partial = data.missing.length > 0;

  /* The one comparison worth putting in words, rather than another muted caption. */
  const comparable = measured.filter((dimension) => dimension.cohort !== null);
  const ahead = comparable.filter((dimension) => dimension.value! > dimension.cohort!).length;

  return (
    <>
      <PageHeader
        eyebrow="Overall Ability Assessment"
        title="Your ability profile"
        description="Four dimensions, weighted into one score out of 100."
      />

      {/*
        The hero plate. One dominant element per page: the score, on ink rather
        than on another white card, so the eye lands here first and the sections
        below read as support rather than as five equal siblings.
      */}
      <section className="drafting relative overflow-hidden border border-ink-900 bg-ink-950">
        <div className="grid items-center gap-8 px-6 py-9 sm:px-9 md:grid-cols-[auto_1fr] md:gap-12">
          <ScoreGauge
            score={data.score}
            grade={data.grade}
            tone="plate"
            className="mx-auto size-44 sm:size-52 md:mx-0"
          />

          <div className="text-center md:text-left">
            <p className="font-serif text-4xl text-ink-50">Grade {data.grade}</p>
            {data.label && <p className="mt-1 font-serif text-xl text-ink-300">{data.label}</p>}

            {comparable.length > 0 && (
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-300 md:mx-0">
                Ahead of the class average on {ahead} of {comparable.length}{' '}
                {comparable.length === 1 ? 'ability' : 'abilities'}.
              </p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-y-6 border-t border-ink-800 px-6 py-6 sm:px-9 lg:grid-cols-4">
          <PlateFact label="Semester">{data.semester}</PlateFact>
          <PlateFact label="Abilities scored">{measured.length} of 4</PlateFact>
          <PlateFact label="Compared with">{data.cohortSize} students</PlateFact>
          <PlateFact label="Last calculated">{formatDate(data.computedAt)}</PlateFact>
        </dl>
      </section>

      {partial && (
        <p className="mt-6 border-l-2 border-accent-500 bg-accent-400/10 px-4 py-3.5 text-sm text-ink-700">
          <span className="kicker block text-ink-800">
            Scored on {measured.length} of 4 abilities
          </span>
          <span className="mt-1.5 block">
            Nothing has been recorded for{' '}
            {data.missing.map((key) => key.toLowerCase()).join(' or ')} this semester, so it is left
            out of the calculation rather than counted as zero — your score is the average of what
            was actually measured.
          </span>
        </p>
      )}

      {/*
        Chart and table side by side, not stacked: they are the same four numbers
        drawn two ways, and pairing them is what lets the shape be scanned and the
        exact figures read without scrolling between the two.
      */}
      {/*
        `min-w-0` on both columns is load-bearing, not tidying. A grid item defaults
        to `min-width: auto`, so the table's `min-w-[32rem]` set the width of the
        single column these collapse into on a phone — which dragged the chart out
        with it and scrolled the whole page sideways.
      */}
      <section className="mt-14 grid gap-x-12 gap-y-10 xl:grid-cols-[minmax(0,24rem)_1fr]">
        <div className="min-w-0">
          <SectionHeading title="The shape" />
          {measured.length >= MIN_RADAR_AXES ? (
            <AbilityRadar dimensions={data.dimensions} cohortSize={data.cohortSize} />
          ) : (
            <p className="text-sm text-ink-500">
              A profile needs at least {MIN_RADAR_AXES} measured abilities before its shape means
              anything. The breakdown alongside carries everything recorded so far.
            </p>
          )}
        </div>

        <div className="min-w-0">
          <SectionHeading
            title="The four abilities"
            note={`Weighted mean of ${measured.length} measured, divided by ${data.divisor}`}
          />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <caption className="sr-only">
                Your score, the class average, and the weight of each ability
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={cn(COL, 'py-2 pr-4 text-left')}>
                    Ability
                  </th>
                  <th scope="col" className={cn(COL, 'py-2 pr-4 text-right')}>
                    You
                  </th>
                  <th scope="col" className={cn(COL, 'py-2 pr-4 text-right')}>
                    Class
                  </th>
                  <th scope="col" className={cn(COL, 'py-2 pr-5 text-right')}>
                    Weight
                  </th>
                  <th scope="col" className={cn(COL, 'w-[38%] py-2 text-left')}>
                    Against the class
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.dimensions.map((dimension) => {
                  const value = dimension.value;

                  return (
                    <tr key={dimension.key} className="border-t border-ink-200">
                      <th scope="row" className="py-3.5 pr-4 text-left font-normal text-ink-900">
                        {dimension.label}
                      </th>
                      <td className="py-3.5 pr-4 text-right font-medium tabular-nums text-ink-900">
                        {value ?? <span className="font-normal text-ink-400">Not recorded</span>}
                      </td>
                      <td className="py-3.5 pr-4 text-right tabular-nums text-ink-500">
                        {dimension.cohort ?? '—'}
                      </td>
                      <td className="py-3.5 pr-5 text-right font-mono text-xs tabular-nums text-ink-500">
                        ×{dimension.weight}
                      </td>
                      <td className="py-3.5">
                        {value === null ? (
                          <span className="text-ink-300">—</span>
                        ) : (
                          /*
                            Rounded data-end on the fill; the class average is a
                            tick carrying a 2px surface ring so it stays legible
                            where it crosses the fill.
                          */
                          <div className="relative h-1.5 w-full rounded-full bg-ink-100">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${value}%`, backgroundColor: YOU }}
                            />
                            {dimension.cohort !== null && (
                              <span
                                aria-hidden="true"
                                className="absolute -top-[0.3125rem] h-4 w-[3px] -translate-x-1/2 rounded-full ring-2 ring-white"
                                style={{
                                  left: `${dimension.cohort}%`,
                                  backgroundColor: COHORT,
                                }}
                                title={`Class average ${dimension.cohort}`}
                              />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-500">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-1.5 w-5 rounded-full"
                style={{ backgroundColor: YOU }}
              />
              You
            </span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3.5 w-[3px] rounded-full"
                style={{ backgroundColor: COHORT }}
              />
              Class average
            </span>
            <span>Social counts half — that is the ×0.5.</span>
          </p>
        </div>
      </section>

      {/* Strongest and weakest, as a pair of facing columns rather than two cards. */}
      {(data.strongest || data.weakest) && (
        <section className="mt-14 grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-2">
          {data.strongest && (
            <div className="bg-white px-6 py-6">
              <p className="kicker text-ink-500">Strongest</p>
              <p className="mt-3 font-serif text-3xl text-ink-900">{data.strongest.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {data.strongest.value} out of 100 — your highest measured ability.
              </p>
            </div>
          )}

          {data.weakest && (
            <div className="relative bg-white px-6 py-6">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-accent-500" />
              <p className="kicker text-accent-700">Work on this first</p>
              <p className="mt-3 font-serif text-3xl text-ink-900">{data.weakest.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {data.weakest.value} out of 100. {data.weakest.advice}
              </p>
            </div>
          )}
        </section>
      )}

      <section className="mt-14">
        <SectionHeading title="Semester trend" note="Your score at the close of each semester" />

        {/*
          The axis runs the full 0–100 because the score does, which leaves a line
          of three points looking flat if it is also stretched the width of the
          page. The table beside it takes that width back — and it is the chart's
          table twin, so every plotted value is readable without the chart.
        */}
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[1fr_16rem]">
          <div className="min-w-0">
            <TrendChart trend={data.trend} />
          </div>

          <table className="h-fit w-full border-collapse text-sm">
            <caption className="sr-only">OAA score by semester</caption>
            <thead>
              <tr>
                <th scope="col" className={cn(COL, 'py-2 pr-4 text-left')}>
                  Semester
                </th>
                <th scope="col" className={cn(COL, 'py-2 pr-4 text-right')}>
                  Score
                </th>
                <th scope="col" className={cn(COL, 'py-2 text-right')}>
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {data.trend.map((point) => (
                <tr key={point.semester} className="border-t border-ink-200">
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink-700">
                    Semester {point.semester}
                  </th>
                  <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-ink-900">
                    {point.score ?? <span className="font-normal text-ink-400">—</span>}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-ink-600">
                    {point.grade ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* What actually fed the number. */}
      <section className="mt-14">
        <SectionHeading title="What fed the number" note="Every record counted this semester" />

        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Adaptability</h3>
            <p className="mt-1 text-sm text-ink-500">
              Rated {data.ratingScale.min}–{data.ratingScale.max} by your teachers.
            </p>

            {data.adaptabilityRatings.length === 0 ? (
              <p className="mt-4 text-sm text-ink-500">No assessment recorded this semester.</p>
            ) : (
              <ul className="mt-3">
                {data.adaptabilityRatings.map((rating) => (
                  <li
                    key={rating.criterion}
                    className="flex items-center justify-between gap-4 border-t border-ink-200 py-2.5 text-sm"
                  >
                    <span className="text-ink-800">{criterionLabel(rating.criterion)}</span>
                    <span
                      className="flex shrink-0 items-center gap-1"
                      title={`${rating.score} of ${data.ratingScale.max}`}
                    >
                      {Array.from({ length: data.ratingScale.max }, (_, index) => (
                        <span
                          key={index}
                          aria-hidden="true"
                          className={cn(
                            'size-1.5 rounded-full',
                            index < rating.score ? 'bg-brand-600' : 'bg-ink-200',
                          )}
                        />
                      ))}
                      <span className="sr-only">
                        {rating.score} out of {data.ratingScale.max}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-900">Physical</h3>
            <p className="mt-1 text-sm text-ink-500">Fitness, PE attendance and sport.</p>
            <RecordList
              records={data.physicalRecords}
              empty="Nothing recorded this semester — this is why the ability is left out of your score rather than counted as zero."
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-900">Social</h3>
            <p className="mt-1 text-sm text-ink-500">Events, volunteering, clubs and mentoring.</p>
            <RecordList records={data.socialRecords} empty="Nothing recorded this semester yet." />
          </div>
        </div>
      </section>

      <p className="mt-14 border-t border-ink-200 pt-5 text-sm text-ink-500">
        Recalculated when a teacher records marks, an assessment or an activity — not each time this
        page loads, so the number here is the same one your department sees.
      </p>
    </>
  );
}
