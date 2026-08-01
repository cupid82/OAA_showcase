import { SURFACE, TRACK, YOU } from './chartTokens';

/**
 * The overall score as a single ratio against 100.
 *
 * A meter, not a chart — one number has no series to tell apart, so a charting
 * library would be all cost. Hand-rolled SVG keeps it a few dozen bytes and lets
 * the arc terminate in a round cap that reads as a dial rather than a pie slice.
 *
 * The unfilled track is a lighter step of the fill's own ramp (brand-100 under
 * brand-600), so the whole ring reads as one scale rather than fill-versus-void.
 */

const SIZE = 200;
const STROKE = 14;
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
  label: string | null;
}

export function ScoreGauge({ score, grade, label }: ScoreGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score ?? 0));
  const end = START + (SWEEP * clamped) / 100;

  return (
    <figure className="flex flex-col items-center">
      <div className="relative">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="size-48 sm:size-56"
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
            stroke={TRACK}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          {score !== null && clamped > 0 && (
            <path
              d={arcPath(START, end)}
              fill="none"
              stroke={YOU}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          )}
          {/* End cap ring, so the dial's head stays legible where it meets the track. */}
          {score !== null && clamped > 0 && (
            <circle
              cx={polar(end)[0]}
              cy={polar(end)[1]}
              r={STROKE / 2 - 3}
              fill={SURFACE}
              stroke={YOU}
              strokeWidth="2"
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/*
            Serif, matching every other figure in this portal. The house dataviz
            default is sans, but here serif is the brand voice — a lone sans number
            would be the thing that looked bolted on.
          */}
          <span className="font-serif text-5xl leading-none text-ink-900 sm:text-6xl">
            {score === null ? '—' : Math.round(score)}
          </span>
          <span className="kicker mt-2 text-ink-500">out of 100</span>
        </div>
      </div>

      <figcaption className="mt-4 text-center">
        {grade ? (
          <>
            <span className="font-serif text-2xl text-ink-900">Grade {grade}</span>
            {label && <span className="mt-1 block text-sm text-ink-600">{label}</span>}
          </>
        ) : (
          <span className="text-sm text-ink-600">Not enough recorded yet to score</span>
        )}
      </figcaption>
    </figure>
  );
}
