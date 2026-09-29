/**
 * Tests for the pure engines: skill proof, momentum, matching and burnout.
 *
 * These come before the UI for the same reason the old OAA engine's did: a wrong
 * chart is obvious, but a wrong number quietly ranks the wrong student first,
 * recommends the wrong internship, or tells an overloaded student they're fine.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assessBurnout, strainOf } from './burnout.js';
import type { CheckinInput } from './burnout.js';
import { addDays, daysBetween, monthStart, weekStart } from './dates.js';
import { MATCH_WEIGHTS, isRecommended, matchListing } from './matching.js';
import type { MatchStudent } from './matching.js';
import { DEFAULT_POINTS, assignRanks, deriveLedger, summarise } from './momentum.js';
import type { MomentumInputs } from './momentum.js';
import { isStoryComplete, proofFor } from './skillProof.js';
import type { SkillEvidence } from './skillProof.js';

const TODAY = '2026-09-29'; // a Tuesday

// --- dates ---------------------------------------------------------------------

describe('dates', () => {
  it('finds the Monday of the ISO week', () => {
    assert.equal(weekStart('2026-09-29'), '2026-09-28'); // Tuesday
    assert.equal(weekStart('2026-09-28'), '2026-09-28'); // Monday itself
    assert.equal(weekStart('2026-10-04'), '2026-09-28'); // Sunday belongs to the week before
  });

  it('adds days across a month boundary', () => {
    assert.equal(addDays('2026-09-29', 3), '2026-10-02');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });

  it('counts whole days in either direction', () => {
    assert.equal(daysBetween('2026-09-29', '2026-10-04'), 5);
    assert.equal(daysBetween('2026-10-04', '2026-09-29'), -5);
  });

  it('finds the first of the month', () => {
    assert.equal(monthStart('2026-09-29'), '2026-09-01');
  });
});

// --- skill proof -------------------------------------------------------------------

const EMPTY: SkillEvidence = { projects: [], certificates: [], events: [], practice: [] };

const shipped = (overrides: Partial<SkillEvidence['projects'][number]> = {}) => ({
  id: 'p1',
  title: 'Campus Eats',
  status: 'shipped' as const,
  problem: 'The canteen queue eats half of every lunch break.',
  skillIds: ['react'],
  shippedAt: '2026-08-01',
  ...overrides,
});

describe('skill proof', () => {
  it('calls a listed skill with no evidence "claimed"', () => {
    assert.equal(proofFor('react', EMPTY, TODAY).stage, 'claimed');
  });

  it('proves a skill used in a shipped project that tells its story', () => {
    const proof = proofFor('react', { ...EMPTY, projects: [shipped()] }, TODAY);
    assert.equal(proof.stage, 'proven');
    assert.equal(proof.provenAt, '2026-08-01');
    assert.deepEqual(proof.shippedProjects, [{ id: 'p1', title: 'Campus Eats' }]);
  });

  it('does not count a shipped project with no problem statement as proof', () => {
    const proof = proofFor(
      'react',
      { ...EMPTY, projects: [shipped({ problem: 'An app' })] },
      TODAY,
    );
    assert.equal(proof.stage, 'claimed');
  });

  it('treats a project still being built as practice, not proof', () => {
    const proof = proofFor(
      'react',
      { ...EMPTY, projects: [shipped({ status: 'building', shippedAt: null })] },
      TODAY,
    );
    assert.equal(proof.stage, 'practising');
    assert.equal(proof.provenAt, null);
  });

  it('proves a skill with a certificate, dated to its issue', () => {
    const proof = proofFor(
      'sql',
      {
        ...EMPTY,
        certificates: [{ id: 'c1', title: 'SQL', issuedOn: '2026-05-10', skillIds: ['sql'] }],
      },
      TODAY,
    );
    assert.equal(proof.stage, 'proven');
    assert.equal(proof.provenAt, '2026-05-10');
  });

  it('takes the earliest proof date when there are several', () => {
    const proof = proofFor(
      'react',
      {
        ...EMPTY,
        projects: [shipped({ shippedAt: '2026-08-01' })],
        certificates: [{ id: 'c1', title: 'React', issuedOn: '2026-03-02', skillIds: ['react'] }],
      },
      TODAY,
    );
    assert.equal(proof.provenAt, '2026-03-02');
  });

  it('needs an hour of practice in the last 30 days to call it "practising"', () => {
    const practice = (minutes: number, date = '2026-09-20') => ({ skillId: 'sql', date, minutes });

    assert.equal(proofFor('sql', { ...EMPTY, practice: [practice(59)] }, TODAY).stage, 'claimed');
    assert.equal(
      proofFor('sql', { ...EMPTY, practice: [practice(60)] }, TODAY).stage,
      'practising',
    );
    // An old hour does not count.
    assert.equal(
      proofFor('sql', { ...EMPTY, practice: [practice(300, '2026-08-01')] }, TODAY).stage,
      'claimed',
    );
  });

  it('counts an event only through the skills the student says they used', () => {
    const events = [{ id: 'e1', title: 'Hack', date: '2026-09-01', skillIds: ['python'] }];
    assert.equal(proofFor('python', { ...EMPTY, events }, TODAY).stage, 'practising');
    assert.equal(proofFor('react', { ...EMPTY, events }, TODAY).stage, 'claimed');
  });

  it('requires both a real problem statement and at least one skill for a story', () => {
    assert.equal(isStoryComplete({ problem: 'Short', skillIds: ['a'] }), false);
    assert.equal(
      isStoryComplete({ problem: 'A long enough problem statement', skillIds: [] }),
      false,
    );
    assert.equal(
      isStoryComplete({ problem: 'A long enough problem statement', skillIds: ['a'] }),
      true,
    );
  });
});

// --- momentum ------------------------------------------------------------------------

const NO_ACTIVITY: MomentumInputs = {
  shippedProjects: [],
  completedTasks: [],
  provenSkills: [],
  certificates: [],
  attendedEvents: [],
  practice: [],
};

describe('momentum ledger', () => {
  it('is empty for a student who has done nothing', () => {
    assert.deepEqual(deriveLedger(NO_ACTIVITY, DEFAULT_POINTS), []);
  });

  it('awards a shipped project and each proven skill', () => {
    const ledger = deriveLedger(
      {
        ...NO_ACTIVITY,
        shippedProjects: [{ id: 'p1', title: 'Campus Eats', shippedAt: '2026-08-01' }],
        provenSkills: [{ skillId: 'react', name: 'React', provenAt: '2026-08-01' }],
      },
      DEFAULT_POINTS,
    );
    assert.equal(
      summarise(ledger).total,
      DEFAULT_POINTS.projectShipped + DEFAULT_POINTS.skillProven,
    );
    assert.equal(summarise(ledger).building, DEFAULT_POINTS.projectShipped);
    assert.equal(summarise(ledger).learning, DEFAULT_POINTS.skillProven);
  });

  it('caps milestones per project, counting the earliest first', () => {
    const tasks = Array.from({ length: 12 }, (_, index) => ({
      id: `t${index}`,
      projectId: 'p1',
      title: `Step ${index}`,
      doneAt: `2026-09-${String(index + 1).padStart(2, '0')}`,
    }));
    const ledger = deriveLedger({ ...NO_ACTIVITY, completedTasks: tasks }, DEFAULT_POINTS);
    const milestones = ledger.filter((entry) => entry.source === 'milestone');

    assert.equal(milestones.length, DEFAULT_POINTS.milestoneCapPerProject);
    assert.equal(milestones[0]?.refId, 't0');
    assert.equal(
      summarise(ledger).total,
      DEFAULT_POINTS.milestoneCapPerProject * DEFAULT_POINTS.milestoneDone,
    );
  });

  it('applies the milestone cap per project, not across all of them', () => {
    const tasks = ['p1', 'p2'].flatMap((projectId) =>
      Array.from({ length: 10 }, (_, index) => ({
        id: `${projectId}-${index}`,
        projectId,
        title: 'Step',
        doneAt: '2026-09-01',
      })),
    );
    const ledger = deriveLedger({ ...NO_ACTIVITY, completedTasks: tasks }, DEFAULT_POINTS);
    assert.equal(ledger.length, DEFAULT_POINTS.milestoneCapPerProject * 2);
  });

  it('pays hackathons more than other events, and adds a bonus for placing', () => {
    const ledger = deriveLedger(
      {
        ...NO_ACTIVITY,
        attendedEvents: [
          { id: 'e1', title: 'Hack', type: 'hackathon', date: '2026-09-01', outcome: 'winner' },
          { id: 'e2', title: 'Talk', type: 'talk', date: '2026-09-02', outcome: null },
          {
            id: 'e3',
            title: 'Contest',
            type: 'contest',
            date: '2026-09-03',
            outcome: 'participated',
          },
        ],
      },
      DEFAULT_POINTS,
    );
    assert.equal(
      summarise(ledger).events,
      DEFAULT_POINTS.hackathonAttended +
        DEFAULT_POINTS.eventPlaced +
        DEFAULT_POINTS.eventAttended * 2,
    );
  });

  it('pools practice by week, pays per full half-hour, and caps each week', () => {
    const ledger = deriveLedger(
      {
        ...NO_ACTIVITY,
        practice: [
          // Week of 2026-09-21: 45 + 50 = 95 minutes → 3 half-hours.
          { date: '2026-09-21', minutes: 45 },
          { date: '2026-09-23', minutes: 50 },
          // Week of 2026-09-28: a 12-hour binge still earns only the cap.
          { date: '2026-09-28', minutes: 720 },
        ],
      },
      DEFAULT_POINTS,
    );
    const practice = ledger.filter((entry) => entry.source === 'practice');

    assert.equal(practice.length, 2);
    assert.equal(practice[0]?.points, 3);
    assert.equal(practice[0]?.at, '2026-09-23'); // dated to the week's last practice
    assert.equal(practice[1]?.points, DEFAULT_POINTS.practiceWeeklyCap);
  });

  it('never awards points for less than half an hour of practice', () => {
    const ledger = deriveLedger(
      { ...NO_ACTIVITY, practice: [{ date: '2026-09-21', minutes: 29 }] },
      DEFAULT_POINTS,
    );
    assert.deepEqual(ledger, []);
  });

  it('reads its point values from the table it is given, never from a constant', () => {
    const doubled = { ...DEFAULT_POINTS, projectShipped: 80 };
    const ledger = deriveLedger(
      {
        ...NO_ACTIVITY,
        shippedProjects: [{ id: 'p1', title: 'A', shippedAt: '2026-08-01' }],
      },
      doubled,
    );
    assert.equal(summarise(ledger).total, 80);
  });

  it('filters a window on the date part of each entry', () => {
    const entries = [
      { source: 'milestone' as const, points: 5, at: '2026-08-31T23:00:00.000Z' },
      { source: 'milestone' as const, points: 5, at: '2026-09-01T00:30:00.000Z' },
      { source: 'certificate' as const, points: 10, at: '2026-09-15' },
    ];
    assert.equal(summarise(entries, '2026-09-01').total, 15);
    assert.equal(summarise(entries).total, 20);
  });
});

describe('ranking', () => {
  it('shares a rank between equal values and skips the next', () => {
    const ranked = assignRanks([{ value: 90 }, { value: 80 }, { value: 80 }, { value: 70 }]);
    assert.deepEqual(
      ranked.map((row) => row.rank),
      [1, 2, 2, 4],
    );
  });
});

// --- matching --------------------------------------------------------------------------

const student = (overrides: Partial<MatchStudent> = {}): MatchStudent => ({
  year: 3,
  trackId: 'fullstack',
  interests: ['internships'],
  skills: new Map([
    ['react', 'proven'],
    ['nodejs', 'practising'],
    ['sql', 'claimed'],
  ]),
  ...overrides,
});

const listing = {
  skillIds: ['react', 'nodejs', 'sql'],
  niceSkillIds: ['docker'],
  eligibleYears: [3, 4],
  trackIds: ['fullstack'],
  interest: 'internships' as const,
};

describe('matching', () => {
  it('scores a perfect, fully-evidenced fit at 100', () => {
    const result = matchListing(
      student({
        skills: new Map([
          ['react', 'proven'],
          ['nodejs', 'proven'],
          ['sql', 'proven'],
          ['docker', 'claimed'],
        ]),
      }),
      listing,
    );
    assert.equal(result.score, 100);
  });

  it('weights each required skill by how well it is evidenced', () => {
    const result = matchListing(student(), listing);
    // (1 + 0.75 + 0.5) / 3 of the skills share, plus track and interest, no nice skills.
    const expected = Math.round(
      ((1 + 0.75 + 0.5) / 3) * MATCH_WEIGHTS.skills + MATCH_WEIGHTS.track + MATCH_WEIGHTS.interest,
    );
    assert.equal(result.score, expected);
  });

  it('lists what the student has, strongest first, and the gap', () => {
    const result = matchListing(
      student({
        skills: new Map([
          ['sql', 'claimed'],
          ['react', 'proven'],
        ]),
      }),
      listing,
    );
    assert.deepEqual(result.have, ['react', 'sql']);
    assert.deepEqual(result.missing, ['nodejs']);
  });

  it('flags a listing the student’s year cannot apply to, and never recommends it', () => {
    const result = matchListing(student({ year: 1 }), listing);
    assert.equal(result.eligible, false);
    assert.equal(isRecommended(result), false);
  });

  it('treats an empty eligible-years list as open to everyone', () => {
    assert.equal(
      matchListing(student({ year: 1 }), { ...listing, eligibleYears: [] }).eligible,
      true,
    );
  });

  it('gives a listing that names no skills the midpoint on skills, not a free 100', () => {
    const result = matchListing(student({ trackId: null, interests: [] }), {
      ...listing,
      skillIds: [],
      niceSkillIds: [],
    });
    assert.equal(result.score, Math.round(0.5 * MATCH_WEIGHTS.skills));
  });

  it('gives no track credit to a student who has not picked a goal', () => {
    const result = matchListing(student({ trackId: null }), listing);
    assert.equal(result.trackFit, false);
  });

  it('scores a student with none of the skills and no fit at 0', () => {
    const result = matchListing(
      student({ trackId: 'data-analyst', interests: [], skills: new Map() }),
      listing,
    );
    assert.equal(result.score, 0);
  });
});

// --- burnout -------------------------------------------------------------------------------

const checkin = (week: string, overrides: Partial<CheckinInput> = {}): CheckinInput => ({
  week,
  energy: 4,
  stress: 2,
  sleepHours: 7.5,
  workload: 2,
  enjoyment: 4,
  ...overrides,
});

const WEEKS = ['2026-09-28', '2026-09-21', '2026-09-14', '2026-09-07'];

describe('burnout', () => {
  it('returns no level — not "steady" — with fewer than two recent check-ins', () => {
    assert.deepEqual(assessBurnout([], 0, TODAY), {
      level: null,
      score: null,
      basedOn: 0,
      factors: [],
    });
    const one = assessBurnout([checkin(WEEKS[0]!)], 0, TODAY);
    assert.equal(one.level, null);
    assert.equal(one.basedOn, 1);
  });

  it('ignores check-ins older than four weeks', () => {
    const reading = assessBurnout(
      [checkin('2026-08-10'), checkin('2026-08-17'), checkin(WEEKS[0]!)],
      0,
      TODAY,
    );
    assert.equal(reading.level, null);
  });

  it('reads a rested, calm student as steady', () => {
    const reading = assessBurnout(
      WEEKS.map((week) => checkin(week)),
      0,
      TODAY,
    );
    assert.equal(reading.level, 'steady');
    assert.deepEqual(reading.factors, []);
  });

  it('reads an exhausted, stressed, sleep-short student as at risk, with reasons', () => {
    const worn = { energy: 1, stress: 5, sleepHours: 4.5, workload: 5, enjoyment: 1 };
    const reading = assessBurnout(
      WEEKS.map((week) => checkin(week, worn)),
      0,
      TODAY,
    );

    assert.equal(reading.level, 'at-risk');
    const keys = reading.factors.map((factor) => factor.key);
    assert.ok(keys.includes('stress'));
    assert.ok(keys.includes('sleep'));
    assert.ok(keys.includes('workload'));
    assert.ok(keys.includes('detachment'));
  });

  it('scores the worst possible check-in as full strain and the best as none', () => {
    const worst = strainOf(
      checkin(WEEKS[0]!, { energy: 1, stress: 5, sleepHours: 3, workload: 5, enjoyment: 1 }),
    );
    const best = strainOf(
      checkin(WEEKS[0]!, { energy: 5, stress: 1, sleepHours: 9, workload: 1, enjoyment: 5 }),
    );
    assert.ok(Math.abs(worst - 1) < 1e-9);
    assert.equal(best, 0);
  });

  it('weighs the latest check-in more than older ones', () => {
    const bad = { energy: 1, stress: 5, sleepHours: 5, workload: 5, enjoyment: 1 };
    const worsening = assessBurnout(
      [checkin(WEEKS[0]!, bad), checkin(WEEKS[1]!), checkin(WEEKS[2]!)],
      0,
      TODAY,
    );
    const recovering = assessBurnout(
      [checkin(WEEKS[0]!), checkin(WEEKS[1]!), checkin(WEEKS[2]!, bad)],
      0,
      TODAY,
    );
    assert.ok((worsening.score ?? 0) > (recovering.score ?? 0));
  });

  it('adds load for a crowded fortnight of deadlines', () => {
    const calm = WEEKS.map((week) => checkin(week));
    const base = assessBurnout(calm, 0, TODAY).score ?? 0;
    assert.equal(assessBurnout(calm, 4, TODAY).score, base + 5);
    assert.equal(assessBurnout(calm, 7, TODAY).score, base + 10);
    assert.ok(assessBurnout(calm, 7, TODAY).factors.some((factor) => factor.key === 'deadlines'));
  });

  it('names a falling energy trend', () => {
    const reading = assessBurnout(
      [
        checkin(WEEKS[2]!, { energy: 4 }),
        checkin(WEEKS[1]!, { energy: 3 }),
        checkin(WEEKS[0]!, { energy: 2 }),
      ],
      0,
      TODAY,
    );
    assert.ok(reading.factors.some((factor) => factor.key === 'energy-drop'));
  });
});
