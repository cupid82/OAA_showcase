import { cn } from '@/lib/cn';

import { PLATE, SURFACE, TRACK, TRACK_ON_PLATE, YOU, YOU_ON_PLATE } from './chartTokens';

/**
 * The overall score as a single ratio against 100.
 *
 * A meter, not a chart — one number has no series to tell apart, so a charting
 * library would be all cost. Hand-rolled SVG keeps it a few dozen bytes and lets
 * the arc terminate in a round cap that reads as a dial rather than a pie slice.
 *
 * The unfilled track is always another step of the fill's *own* ramp, so the ring
 * reads as one scale rather than fill-versus-void. Which steps depends on where
 * the meter is drawn: `tone="plate"` re-steps it for the dark hero surface, with
 * both values validated against that surface rather than flipped from the light
 * pair. See `chartTokens.ts` for the measured ratios.
 *
 * The figure itself is Newsreader. The house dataviz default puts hero numbers in
 * the UI sans, but this portal sets every figure in the serif (see CLAUDE.md), and
 * a lone sans number here would be the thing that looked bolted on. Proportional
 * figures, not tabular — at this size `tabular-nums` makes a number like 82 gappy.
 */

const SIZE = 200;
const STROKE = 13;
const RADIUS = (SIZE - STROKE) / 2;

/** Three-quarter dial: starts bottom-left, sweeps 270°, ends bottom-right. */
const SWEEP = 270;
const START = 135;

function polar(angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [SIZE / 2 + RADIUS * Math.cos(rad), SIZE / 2 + RADIUS * Math.sin(rad)];
}

function arcPath(fromDeg: number, toDeg: number): string {
  const [x1, y1] = polar(fromDeg);
  const [x2, y2] = polar(toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${x2} ${y2}`;
}

interface ScoreGaugeProps {
  /** 0–100, or null when nothing has been measured yet. */
  score: number | null;
  grade: string | null;
  /** Which surface the meter is drawn on. */
  tone?: 'card' | 'plate';
  className?: string;
}

export function ScoreGauge({ score, grade, tone = 'card', className }: ScoreGaugeProps) {
  const plate = tone === 'plate';
  const fill = plate ? YOU_ON_PLATE : YOU;
  const track = plate ? TRACK_ON_PLATE : TRACK;
  const surface = plate ? PLATE : SURFACE;

  const clamped = Math.min(100, Math.max(0, score ?? 0));
  const end = START + (SWEEP * clamped) / 100;
  const drawn = score !== null && clamped > 0;

  return (
    <div className={className}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="size-full"
          role="img"
          aria-label={
            score === null
              ? 'Overall ability assessment: not enough data yet'
              : `Overall ability assessment: ${score} out of 100, grade ${grade}`
          }
        >
          <path
            d={arcPath(START, START + SWEEP)}
            fill="none"
            stroke={track}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          {drawn && (
            <path
              d={arcPath(START, end)}
              fill="none"
              stroke={fill}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          )}
          {/*
            End cap ring, in the surface colour — the 2px surface ring that keeps
            the dial's head legible where it crosses the track.
          */}
          {drawn && (
            <circle
              cx={polar(end)[0]}
              cy={polar(end)[1]}
              r={STROKE / 2 - 3}
              fill={surface}
              stroke={fill}
              strokeWidth="2"
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Proportional figures, not tabular — see the note at the top of this file. */}
          <span
            className={cn(
              'font-serif text-[3.75rem] leading-none sm:text-[4.5rem]',
              plate ? 'text-ink-100' : 'text-ink-900',
            )}
          >
            {score === null ? '—' : Math.round(score)}
          </span>
          <span className={cn('kicker mt-1', plate ? 'text-ink-400' : 'text-ink-500')}>
            out of 100
          </span>
        </div>
      </div>
    </div>
  );
}
