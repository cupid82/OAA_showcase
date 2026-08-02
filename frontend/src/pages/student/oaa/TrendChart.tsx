import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { TrendPoint } from '@/types';

import { AXIS_TEXT, GRID, PLANE, YOU } from './chartTokens';

/**
 * OAA across semesters. One series, so no legend box — the heading names it.
 *
 * Only the final point is directly labelled. A number on every dot is the classic
 * way to make a four-point line unreadable; the axis and the tooltip carry the
 * rest, and the table below carries all of it.
 */
export function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const points = trend.filter((point) => point.score !== null);
  const last = points.at(-1);

  return (
    <figure>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 16, right: 28, bottom: 4, left: -18 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="semester"
              tickFormatter={(semester: number) => `Sem ${semester}`}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              tick={{ fill: AXIS_TEXT, fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS_TEXT, fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: GRID, strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as TrendPoint | undefined;
                if (!point) return null;

                return (
                  <div className="border border-ink-300 bg-white px-3 py-2 text-sm shadow-card">
                    <p className="kicker text-ink-500">Semester {point.semester}</p>
                    <p className="mt-1 font-medium text-ink-900">
                      {point.score ?? '—'}
                      {point.grade && (
                        <span className="ml-2 text-ink-600">Grade {point.grade}</span>
                      )}
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke={YOU}
              strokeWidth={2}
              strokeLinecap="round"
              connectNulls={false}
              dot={{ r: 4, fill: YOU, stroke: PLANE, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: YOU, stroke: PLANE, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="mt-3 text-xs text-ink-500">
        {last && points.length > 1 ? (
          <>
            Currently {last.score}, from {points[0]?.score} in semester {points[0]?.semester}.
          </>
        ) : (
          'One semester recorded so far — the line fills in as each semester closes.'
        )}
      </figcaption>
    </figure>
  );
}
