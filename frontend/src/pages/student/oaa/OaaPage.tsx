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

function formatDateTime(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function RecordList({ records, empty }: { records: ContributingRecord[]; empty: string }) {
  if (records.length === 0) return <p className="mt-4 text-sm text-ink-500">{empty}</p>;

  return (
    <ul className="mt-4">
      {records.map((record, index) => (
        <li
          key={`${record.label}-${index}`}
          className="flex items-baseline justify-between gap-4 border-t border-ink-200 py-3 text-sm"
        >
          <span className="text-ink-900">{record.label}</span>
          <span className="shrink-0 tabular-nums text-ink-600">+{record.points}</span>
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
        <PageHeader title="OAA score" description="Your four-dimension ability profile." />
        <EmptyState
          title="Nothing recorded yet"
          description="Your ability score appears once marks, assessments or activity records exist for this semester."
        />
      </>
    );
  }

  const measured = data.dimensions.filter((dimension) => dimension.value !== null);
  const partial = data.missing.length > 0;

  return (
    <>
      <PageHeader
        title="OAA score"
        description={`Overall Ability Assessment · semester ${data.semester} · last calculated ${formatDateTime(data.computedAt)}`}
      />

      {/*
        Hero: the number, and the shape beside it. With fewer than three measured
        abilities there is no polygon worth drawing, so the gauge takes the full
        width and the table below carries the breakdown on its own.
      */}
      <section
        className={cn(
          'grid items-center gap-10 border border-ink-300 bg-white px-6 py-8 lg:gap-14 lg:px-10',
          measured.length >= MIN_RADAR_AXES && 'lg:grid-cols-[auto_1fr]',
        )}
      >
        <ScoreGauge score={data.score} grade={data.grade} label={data.label} />
        {measured.length >= MIN_RADAR_AXES && (
          <AbilityRadar dimensions={data.dimensions} cohortSize={data.cohortSize} />
        )}
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

      {/* The table twin: every plotted value, reachable without the chart. */}
      <section className="mt-12">
        <h2 className="border-b border-ink-300 pb-3 font-serif text-xl text-ink-900">
          The four abilities
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">
              Your score, the class average, and the weight of each ability
            </caption>
            <thead>
              <tr className="kicker text-ink-500">
                <th scope="col" className="py-3 pr-4 text-left font-medium">
                  Ability
                </th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">
                  You
                </th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">
                  Class
                </th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">
                  Weight
                </th>
                <th scope="col" className="w-2/5 py-3 text-left font-medium">
                  Against the class
                </th>
              </tr>
            </thead>
            <tbody>
              {data.dimensions.map((dimension) => {
                const value = dimension.value;

                return (
                  <tr key={dimension.key} className="border-t border-ink-200">
                    <th scope="row" className="py-3 pr-4 text-left font-normal text-ink-900">
                      {dimension.label}
                    </th>
                    <td className="py-3 pr-4 text-right tabular-nums text-ink-900">
                      {value ?? <span className="text-ink-400">Not recorded</span>}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-ink-600">
                      {dimension.cohort ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-ink-600">
                      ×{dimension.weight}
                    </td>
                    <td className="py-3">
                      {value === null ? (
                        <span className="text-sm text-ink-400">—</span>
                      ) : (
                        <div className="relative h-2 w-full bg-ink-100">
                          <div
                            className="h-full"
                            style={{ width: `${value}%`, backgroundColor: YOU }}
                          />
                          {dimension.cohort !== null && (
                            <span
                              aria-hidden="true"
                              className="absolute top-0 h-full w-0.5"
                              style={{ left: `${dimension.cohort}%`, backgroundColor: COHORT }}
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

        <p className="mt-4 text-sm text-ink-500">
          Social counts half — that is the ×0.5 weight. Your score is the weighted mean of the{' '}
          {measured.length} measured abilities, divided by {data.divisor}.
        </p>
      </section>

      {/* Strongest / weakest, and what to do about the weakest. */}
      <section className="mt-12 grid gap-px border border-ink-300 bg-ink-300 sm:grid-cols-2">
        {data.strongest && (
          <div className="border-t-2 border-brand-400 bg-white px-5 py-5">
            <p className="kicker text-ink-500">Strongest ability</p>
            <p className="mt-2 font-serif text-2xl text-ink-900">{data.strongest.label}</p>
            <p className="mt-1 text-sm text-ink-600">
              Scored {data.strongest.value} out of 100 — your highest measured dimension.
            </p>
          </div>
        )}

        {data.weakest && (
          <div className="border-t-2 border-accent-500 bg-white px-5 py-5">
            <p className="kicker text-ink-500">Work on this first</p>
            <p className="mt-2 font-serif text-2xl text-ink-900">{data.weakest.label}</p>
            <p className="mt-1 text-sm text-ink-600">
              Scored {data.weakest.value} out of 100. {data.weakest.advice}
            </p>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="border-b border-ink-300 pb-3 font-serif text-xl text-ink-900">
          Semester trend
        </h2>
        <div className="mt-4">
          <TrendChart trend={data.trend} />
        </div>

        <table className="sr-only">
          <caption>OAA score by semester</caption>
          <thead>
            <tr>
              <th scope="col">Semester</th>
              <th scope="col">Score</th>
              <th scope="col">Grade</th>
            </tr>
          </thead>
          <tbody>
            {data.trend.map((point) => (
              <tr key={point.semester}>
                <th scope="row">{point.semester}</th>
                <td>{point.score ?? 'Not scored'}</td>
                <td>{point.grade ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* What actually fed the number. */}
      <section className="mt-12 grid gap-x-12 gap-y-10 lg:grid-cols-3">
        <div>
          <h2 className="font-serif text-xl text-ink-900">Adaptability ratings</h2>
          <p className="mt-1 text-sm text-ink-500">
            Rated {data.ratingScale.min}–{data.ratingScale.max} by your teachers.
          </p>

          {data.adaptabilityRatings.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No assessment recorded this semester.</p>
          ) : (
            <ul className="mt-4">
              {data.adaptabilityRatings.map((rating) => (
                <li
                  key={rating.criterion}
                  className="flex items-center justify-between gap-4 border-t border-ink-200 py-3 text-sm"
                >
                  <span className="text-ink-900">{criterionLabel(rating.criterion)}</span>
                  <span className="flex shrink-0 items-center gap-1" title={`${rating.score} of 5`}>
                    {Array.from({ length: data.ratingScale.max }, (_, index) => (
                      <span
                        key={index}
                        aria-hidden="true"
                        className={cn(
                          'size-2 rounded-full',
                          index < rating.score ? 'bg-brand-600' : 'bg-ink-200',
                        )}
                      />
                    ))}
                    <span className="sr-only">{rating.score} out of 5</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="font-serif text-xl text-ink-900">Physical record</h2>
          <p className="mt-1 text-sm text-ink-500">Fitness, PE attendance and sport.</p>
          <RecordList
            records={data.physicalRecords}
            empty="Nothing recorded this semester — this is why the dimension is left out of your score."
          />
        </div>

        <div>
          <h2 className="font-serif text-xl text-ink-900">Social contribution</h2>
          <p className="mt-1 text-sm text-ink-500">Events, volunteering, clubs and mentoring.</p>
          <RecordList records={data.socialRecords} empty="Nothing recorded this semester yet." />
        </div>
      </section>

      <p className="mt-12 border-t border-ink-300 pt-5 text-sm text-ink-500">
        Your score is recalculated when a teacher records marks, an assessment or an activity — not
        each time this page loads, so the number here is the same one your department sees.
      </p>
    </>
  );
}
