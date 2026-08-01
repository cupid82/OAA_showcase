/**
 * Tests for the OAA engine.
 *
 * These exist because a wrong score is invisible. A broken chart announces itself;
 * a formula that quietly ranks the wrong student first does not. Every case the
 * roadmap named for Step 7 is here, plus the edges that bit while writing it.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ADAPTABILITY_CRITERIA } from '../data/types.js';
import type { AdaptabilityCriterion } from '../data/types.js';
import {
  ABILITY_BANDS,
  DEFAULT_WEIGHTS,
  PHYSICAL_POINTS_FOR_100,
  SOCIAL_POINTS_FOR_100,
  abilityGrade,
  academicScore,
  adaptabilityScore,
  calculateOaa,
  pointsToScore,
  strongestDimension,
  weakestDimension,
} from './oaa.js';
import type { OaaInputs } from './oaa.js';

/** Every criterion at the same rating. */
function flatRating(value: number): Record<AdaptabilityCriterion, number> {
  return Object.fromEntries(ADAPTABILITY_CRITERIA.map((c) => [c, value])) as Record<
    AdaptabilityCriterion,
    number
  >;
}

const all = (value: number | null): OaaInputs => ({
  academic: value,
  adaptability: value,
  physical: value,
  social: value,
});

describe('abilityGrade — rounds before the band lookup', () => {
  it('rounds 95.4 down to 95, which is an A', () => {
    assert.equal(abilityGrade(95.4).grade, 'A');
  });

  it('rounds 95.6 up to 96, which is an A+', () => {
    assert.equal(abilityGrade(95.6).grade, 'A+');
  });

  it('treats the band minimum as inclusive', () => {
    assert.equal(abilityGrade(96).grade, 'A+');
    assert.equal(abilityGrade(90).grade, 'A');
    assert.equal(abilityGrade(40).grade, 'D');
  });

  it('covers the full table with no gaps', () => {
    // Every integer 0–100 must land in exactly one band.
    for (let score = 0; score <= 100; score += 1) {
      const band = abilityGrade(score);
      assert.ok(band, `no band for ${score}`);
      assert.ok(score >= band.min, `${score} matched a band above it`);
    }
  });

  it('is ordered high to low, so the first match is the right one', () => {
    const mins = ABILITY_BANDS.map((band) => band.min);
    assert.deepEqual(
      mins,
      [...mins].sort((a, b) => b - a),
    );
  });

  it('bottoms out at F rather than throwing', () => {
    assert.equal(abilityGrade(0).grade, 'F');
    assert.equal(abilityGrade(39.4).grade, 'F');
  });
});

describe('calculateOaa — the formula', () => {
  it('gives 100 and an A+ when every input is 100', () => {
    const result = calculateOaa(all(100), DEFAULT_WEIGHTS);
    assert.equal(result.score, 100);
    assert.equal(result.grade, 'A+');
    assert.equal(result.divisor, 3.5);
  });

  it('gives 0 and an F when every input is 0', () => {
    const result = calculateOaa(all(0), DEFAULT_WEIGHTS);
    assert.equal(result.score, 0);
    assert.equal(result.grade, 'F');
  });

  it('applies the half weight to social', () => {
    // Social alone is high; with weight 0.5 it pulls less than a full dimension.
    const result = calculateOaa(
      { academic: 60, adaptability: 60, physical: 60, social: 100 },
      DEFAULT_WEIGHTS,
    );

    // (60 + 60 + 60 + 0.5*100) / 3.5 = 230/3.5 = 65.71…
    assert.equal(result.score, 65.7);
  });

  it('matches the spec formula across a spread of inputs', () => {
    const cases: OaaInputs[] = [
      { academic: 88, adaptability: 72, physical: 64, social: 40 },
      { academic: 51, adaptability: 49, physical: 90, social: 12 },
      { academic: 100, adaptability: 0, physical: 50, social: 75 },
    ];

    for (const inputs of cases) {
      const expected =
        (inputs.academic! + inputs.adaptability! + inputs.physical! + 0.5 * inputs.social!) / 3.5;

      assert.equal(calculateOaa(inputs, DEFAULT_WEIGHTS).score, Math.round(expected * 10) / 10);
    }
  });

  it('reads the weights it is given rather than hardcoding 0.5', () => {
    const inputs: OaaInputs = { academic: 40, adaptability: 40, physical: 40, social: 100 };

    const half = calculateOaa(inputs, DEFAULT_WEIGHTS).score;
    const full = calculateOaa(inputs, { ...DEFAULT_WEIGHTS, social: 1 }).score;

    // Raising the social weight must pull a high social score further up.
    assert.ok(full! > half!, `expected ${full} > ${half}`);
    assert.equal(full, 55); // (40+40+40+100)/4
  });

  it('never returns a score outside 0–100', () => {
    const result = calculateOaa(all(100), { ...DEFAULT_WEIGHTS, social: 4 });
    assert.ok(result.score! <= 100);
  });
});

describe('calculateOaa — the missing-data rule', () => {
  it('does not zero a student who has no physical records', () => {
    const inputs: OaaInputs = { academic: 80, adaptability: 80, physical: null, social: 80 };
    const result = calculateOaa(inputs, DEFAULT_WEIGHTS);

    // Dropped and renormalised: (80 + 80 + 0.5*80) / 2.5 = 80.
    assert.equal(result.score, 80);
    assert.deepEqual(result.missing, ['physical']);
    assert.deepEqual(result.measured, ['academic', 'adaptability', 'social']);
    assert.equal(result.divisor, 2.5);
  });

  it('is strictly better than treating the gap as zero', () => {
    const withGap = calculateOaa(
      { academic: 80, adaptability: 80, physical: null, social: 80 },
      DEFAULT_WEIGHTS,
    );
    const zeroed = calculateOaa(
      { academic: 80, adaptability: 80, physical: 0, social: 80 },
      DEFAULT_WEIGHTS,
    );

    assert.ok(withGap.score! > zeroed.score!);
  });

  it('distinguishes "not measured" from "measured as zero"', () => {
    const notMeasured = calculateOaa(
      { academic: 90, adaptability: 90, physical: null, social: 90 },
      DEFAULT_WEIGHTS,
    );
    const measuredZero = calculateOaa(
      { academic: 90, adaptability: 90, physical: 0, social: 90 },
      DEFAULT_WEIGHTS,
    );

    assert.equal(notMeasured.score, 90);
    assert.notEqual(measuredZero.score, 90);
  });

  it('returns null rather than 0 when nothing has been measured', () => {
    const result = calculateOaa(all(null), DEFAULT_WEIGHTS);

    assert.equal(result.score, null);
    assert.equal(result.grade, null);
    assert.equal(result.divisor, 0);
    assert.deepEqual(result.measured, []);
  });

  it('survives every dimension being the only one present', () => {
    for (const only of ['academic', 'adaptability', 'physical', 'social'] as const) {
      const inputs = { ...all(null), [only]: 70 } as OaaInputs;
      const result = calculateOaa(inputs, DEFAULT_WEIGHTS);

      // A lone dimension is its own mean, whatever its weight.
      assert.equal(result.score, 70, `${only} alone should score 70`);
    }
  });
});

describe('academicScore', () => {
  it('is the mean percentage across graded subjects', () => {
    const score = academicScore([
      { total: 90, totalMax: 100 },
      { total: 70, totalMax: 100 },
    ]);
    assert.equal(score, 80);
  });

  it('normalises subjects with different maximums', () => {
    assert.equal(academicScore([{ total: 25, totalMax: 50 }]), 50);
  });

  it('returns null, not 0, when there are no marks', () => {
    assert.equal(academicScore([]), null);
  });

  it('ignores a subject with a zero maximum instead of dividing by it', () => {
    const score = academicScore([
      { total: 80, totalMax: 100 },
      { total: 0, totalMax: 0 },
    ]);
    assert.equal(score, 80);
  });
});

describe('adaptabilityScore', () => {
  it('maps the top rating to 100 and the bottom to 0', () => {
    assert.equal(adaptabilityScore([flatRating(5)]), 100);
    assert.equal(adaptabilityScore([flatRating(1)]), 0);
  });

  it('puts the midpoint rating at 50', () => {
    assert.equal(adaptabilityScore([flatRating(3)]), 50);
  });

  it('averages across several teachers rating the same student', () => {
    assert.equal(adaptabilityScore([flatRating(5), flatRating(1)]), 50);
  });

  it('returns null when nobody has rated the student', () => {
    assert.equal(adaptabilityScore([]), null);
  });

  it('averages the seven criteria rather than taking the best', () => {
    const mixed = { ...flatRating(1), leadership: 5 } as Record<AdaptabilityCriterion, number>;
    const score = adaptabilityScore([mixed])!;

    assert.ok(score > 0 && score < 100);
    // Six 1s and one 5 → mean 1.571 → (0.571/4)*100 = 14.3
    assert.equal(score, 14.3);
  });
});

describe('pointsToScore', () => {
  it('maps the full-credit point total to 100', () => {
    assert.equal(
      pointsToScore([{ points: PHYSICAL_POINTS_FOR_100 }], PHYSICAL_POINTS_FOR_100),
      100,
    );
    assert.equal(pointsToScore([{ points: SOCIAL_POINTS_FOR_100 }], SOCIAL_POINTS_FOR_100), 100);
  });

  it('sums several records', () => {
    assert.equal(pointsToScore([{ points: 15 }, { points: 15 }], 60), 50);
  });

  it('caps at 100 rather than rewarding beyond the ceiling', () => {
    assert.equal(pointsToScore([{ points: 500 }], 60), 100);
  });

  it('returns null for no records, but 0 for records worth nothing', () => {
    assert.equal(pointsToScore([], 60), null);
    assert.equal(pointsToScore([{ points: 0 }], 60), 0);
  });
});

describe('strongest and weakest dimensions', () => {
  const inputs: OaaInputs = { academic: 91, adaptability: 64, physical: 78, social: 40 };

  it('name the actual extremes', () => {
    assert.equal(strongestDimension(inputs), 'academic');
    assert.equal(weakestDimension(inputs), 'social');
  });

  it('ignore dimensions that were never measured', () => {
    const gapped: OaaInputs = { academic: 91, adaptability: 64, physical: null, social: null };
    assert.equal(weakestDimension(gapped), 'adaptability');
  });

  it('return null when nothing is measured', () => {
    assert.equal(strongestDimension(all(null)), null);
    assert.equal(weakestDimension(all(null)), null);
  });
});
