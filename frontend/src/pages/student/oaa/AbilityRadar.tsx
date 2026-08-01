import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import type { DimensionBreakdown } from '@/types';

import { AXIS_TEXT, COHORT, GRID, SURFACE, YOU } from './chartTokens';

/**
 * The four-dimension ability profile — the signature visual of the portal.
 *
 * Two series, so this is **emphasis**: the student in the brand hue is the
 * subject, the class average in gray is context. A legend is present because
 * there is more than one series, and every value is also in the table below the
 * chart, so nothing is reachable only by hovering.
 *
 * **Unmeasured dimensions are dropped from the chart, not passed as null.**
 * Recharts coerces a null radar value to 0, which plots the point at the centre
 * and reads as "scored zero" — the one reading the whole missing-data rule exists
 * to prevent. An axis nobody has data for is omitted and named in the caption
 * instead; the table below still lists it as "Not recorded".
 *
 * Below three measured dimensions there is no polygon worth drawing, so the
 * caller falls back to the table.
 */

interface RadarPoint {
  key: string;
  dimension: string;
  you: number | null;
  cohort: number | null;
}

/** What Recharts injects into a `PolarAngleAxis` tick element. */
interface TickProps {
  x?: number;
  y?: number;
  /** Recharts sets this from the axis angle; SVG only accepts these four. */
  textAnchor?: 'start' | 'middle' | 'end' | 'inherit';
  payload?: { value?: string };
  points?: RadarPoint[];
}

/**
 * Axis label plus that axis's own score.
 *
 * Four numbers at the perimeter is the one place a value-per-point earns its
 * keep: there is a single series, the labels sit outside the plot rather than
 * over it, and without them the shape is unreadable without a mouse. The exact
 * figures still live in the table below, so nothing is gated behind hover.
 */
function DimensionTick({ x = 0, y = 0, textAnchor, payload, points = [] }: TickProps) {
  const point = points.find((entry) => entry.dimension === payload?.value);
  const above = y < 0 ? 0 : 1; // Top-of-chart labels need the value below the name.

  return (
    <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="middle">
      <tspan x={x} dy={above ? '-0.2em' : '0'} fill={AXIS_TEXT} fontSize={13}>
        {payload?.value}
      </tspan>
      <tspan x={x} dy="1.35em" fill={YOU} fontSize={14} fontWeight={600}>
        {point?.you ?? '—'}
      </tspan>
    </text>
  );
}

interface AbilityRadarProps {
  dimensions: DimensionBreakdown[];
  cohortSize: number;
}

/** A radar needs at least a triangle before its shape means anything. */
export const MIN_RADAR_AXES = 3;

export function AbilityRadar({ dimensions, cohortSize }: AbilityRadarProps) {
  const measured = dimensions.filter((dimension) => dimension.value !== null);
  const omitted = dimensions.filter((dimension) => dimension.value === null);

  const data: RadarPoint[] = measured.map((dimension) => ({
    key: dimension.key,
    dimension: dimension.label,
    you: dimension.value,
    cohort: dimension.cohort,
  }));

  return (
    <figure>
      <div className="h-[22rem] w-full sm:h-[26rem]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={data}
            outerRadius="70%"
            margin={{ top: 24, right: 56, bottom: 16, left: 56 }}
          >
            <PolarGrid stroke={GRID} />
            <PolarAngleAxis
              dataKey="dimension"
              tick={<DimensionTick points={data} />}
              tickLine={false}
            />
            {/*
              The radius scale is set but its ticks are not drawn. Recharts lays
              them along the first axis, where they landed on top of the
              "Adaptability" label — and a ring chart does not need them: the grid
              rings carry the scale, the caption states the 0–100 range, and every
              exact value is in the table below and in the hover card.
            */}
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickLine={false} />

            {/* Context first, so the student's polygon draws on top of it. */}
            <Radar
              name={`Class average (${cohortSize})`}
              dataKey="cohort"
              stroke={COHORT}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              fill="none"
              dot={{ r: 3, fill: COHORT, stroke: SURFACE, strokeWidth: 1.5 }}
              isAnimationActive={false}
            />
            <Radar
              name="You"
              dataKey="you"
              stroke={YOU}
              strokeWidth={2.5}
              fill={YOU}
              fillOpacity={0.14}
              dot={{ r: 4.5, fill: YOU, stroke: SURFACE, strokeWidth: 2 }}
              isAnimationActive={false}
            />

            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as RadarPoint | undefined;
                if (!point) return null;

                return (
                  <div className="border border-ink-300 bg-white px-3 py-2 text-sm shadow-card">
                    <p className="kicker text-ink-500">{point.dimension}</p>
                    <p className="mt-1.5 flex items-center gap-2 text-ink-900">
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0"
                        style={{ backgroundColor: YOU }}
                      />
                      You {point.you}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-ink-600">
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0"
                        style={{ backgroundColor: COHORT }}
                      />
                      Class {point.cohort ?? '—'}
                    </p>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/*
        Legend — always present for two or more series, and it repeats the line
        style as well as the colour, so the two are told apart without relying on
        hue at all.
      */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm">
        <span className="flex items-center gap-2 text-ink-900">
          <span
            aria-hidden="true"
            className="h-[3px] w-6 rounded-full"
            style={{ backgroundColor: YOU }}
          />
          You
        </span>
        <span className="flex items-center gap-2 text-ink-600">
          <svg aria-hidden="true" width="24" height="3" className="overflow-visible">
            <line
              x1="0"
              y1="1.5"
              x2="24"
              y2="1.5"
              stroke={COHORT}
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
          </svg>
          Class average, {cohortSize} students
        </span>
      </div>

      <figcaption className="mt-3 text-sm text-ink-500">
        Each axis runs 0 at the centre to 100 at the outer ring. The shape is the point: a balanced
        profile fills evenly, a spike shows one ability carrying the rest.
        {omitted.length > 0 && (
          <>
            {' '}
            {omitted.map((dimension) => dimension.label).join(' and ')}{' '}
            {omitted.length === 1 ? 'has' : 'have'} no records this semester, so{' '}
            {omitted.length === 1 ? 'that axis is' : 'those axes are'} left off rather than drawn as
            a zero.
          </>
        )}
      </figcaption>
    </figure>
  );
}
