/**
 * The Postgres schema, derived from the domain types.
 *
 * Every table in `Database` maps to one table in the `oaa` schema, one column per
 * field. The `columns` object for each table is typed against the row type, so a
 * field added to `types.ts` without a column here fails the typecheck — the two
 * cannot drift apart silently.
 *
 * The schema lives in `oaa`, not `public`, so Supabase's Data API never exposes
 * it. Row level security is still enabled on every table, and the `anon` and
 * `authenticated` roles have no grants: only the backend's own connection (the
 * table owner) can read or write, and every rule about who sees what stays in
 * the services, where it is tested.
 */
import type { Database } from './types.js';

export const DB_SCHEMA = 'oaa';

/** Column types. A trailing `?` makes the column nullable. */
type Kind = 'text' | 'int' | 'double' | 'bool' | 'date' | 'ts' | 'json' | 'text[]' | 'int[]';
type Decl = Kind | `${Kind}?`;

type RowOf<K extends keyof Database> = Database[K] extends readonly (infer R)[] ? R : Database[K];

export interface ColumnSpec {
  field: string;
  column: string;
  kind: Kind;
  nullable: boolean;
}

export interface TableSpec {
  key: keyof Database;
  table: string;
  /** A single row (settings, meta) rather than a list. */
  singleton: boolean;
  columns: ColumnSpec[];
  /** field → parent table. Deferred, so a save's row order never matters. */
  references: { field: string; table: string; cascade: boolean }[];
  unique: string[][];
}

const snake = (field: string) => field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

function define<K extends keyof Database>(
  key: K,
  table: string,
  columns: { [F in keyof RowOf<K>]-?: Decl },
  options: {
    references?: Partial<
      Record<keyof RowOf<K> & string, string | { table: string; cascade: true }>
    >;
    unique?: (keyof RowOf<K> & string)[][];
  } = {},
): TableSpec {
  return {
    key,
    table,
    singleton: key === 'settings' || key === 'meta',
    columns: Object.entries(columns as Record<string, Decl>).map(([field, decl]) => ({
      field,
      column: snake(field),
      kind: decl.replace('?', '') as Kind,
      nullable: decl.endsWith('?'),
    })),
    references: Object.entries(options.references ?? {}).map(([field, target]) => ({
      field,
      table: typeof target === 'string' ? target : (target as { table: string }).table,
      cascade: typeof target !== 'string',
    })),
    unique: (options.unique ?? []) as string[][],
  };
}

/** Parents before children: seeding inserts in this order, deleting runs in reverse. */
export const TABLES: TableSpec[] = [
  define('meta', 'app_meta', { id: 'text', schemaVersion: 'int', seededAt: 'ts' }),
  define('settings', 'settings', {
    id: 'text',
    academicYear: 'text',
    erpName: 'text',
    erpUrl: 'text',
    momentumPoints: 'json',
    wellbeingSupport: 'json',
  }),
  define(
    'users',
    'users',
    {
      id: 'text',
      loginId: 'text',
      role: 'text',
      name: 'text',
      email: 'text?',
      authId: 'text?',
      passwordHash: 'text?',
      createdAt: 'ts',
    },
    { unique: [['loginId'], ['authId']] },
  ),
  define('skills', 'skills', {
    id: 'text',
    name: 'text',
    category: 'text',
    description: 'text',
    resourceUrl: 'text?',
    resourceLabel: 'text?',
  }),
  define('tracks', 'tracks', { id: 'text', name: 'text', summary: 'text', skills: 'json' }),
  define('projectIdeas', 'project_ideas', {
    id: 'text',
    title: 'text',
    summary: 'text',
    difficulty: 'text',
    hours: 'int',
    trackIds: 'text[]',
    skillIds: 'text[]',
    milestones: 'text[]',
  }),
  define(
    'students',
    'students',
    {
      id: 'text',
      userId: 'text',
      rollNo: 'text?',
      name: 'text',
      department: 'text?',
      year: 'int?',
      recordsSyncedAt: 'ts?',
      email: 'text',
      handle: 'text',
      headline: 'text',
      bio: 'text',
      trackId: 'text?',
      interests: 'text[]',
      weeklyHours: 'int?',
      onboardedAt: 'ts?',
      createdAt: 'ts',
    },
    { references: { userId: 'users', trackId: 'tracks' }, unique: [['userId'], ['handle']] },
  ),
  define(
    'preferences',
    'preferences',
    {
      id: 'text',
      studentId: 'text',
      notify: 'json',
      emailDigest: 'text',
      leaderboardVisible: 'bool',
      portfolioPublic: 'bool',
      snoozeUntil: 'ts?',
    },
    { references: { studentId: 'students' }, unique: [['studentId']] },
  ),
  define(
    'studentSkills',
    'student_skills',
    {
      id: 'text',
      studentId: 'text',
      skillId: 'text',
      level: 'text',
      addedAt: 'ts',
      updatedAt: 'ts',
    },
    {
      references: { studentId: 'students', skillId: 'skills' },
      unique: [['studentId', 'skillId']],
    },
  ),
  define(
    'practiceLogs',
    'practice_logs',
    {
      id: 'text',
      studentId: 'text',
      skillId: 'text',
      date: 'date',
      minutes: 'int',
      note: 'text',
      createdAt: 'ts',
    },
    { references: { studentId: 'students', skillId: 'skills' } },
  ),
  define(
    'certificates',
    'certificates',
    {
      id: 'text',
      studentId: 'text',
      title: 'text',
      issuer: 'text',
      issuedOn: 'date',
      url: 'text?',
      skillIds: 'text[]',
      showOnPortfolio: 'bool',
      createdAt: 'ts',
    },
    { references: { studentId: 'students' } },
  ),
  define(
    'projects',
    'projects',
    {
      id: 'text',
      ownerId: 'text',
      title: 'text',
      tagline: 'text',
      problem: 'text',
      role: 'text',
      outcome: 'text',
      status: 'text',
      skillIds: 'text[]',
      repoUrl: 'text?',
      demoUrl: 'text?',
      visibility: 'text',
      openToCollaborators: 'bool',
      lookingFor: 'text',
      source: 'text',
      sourceRef: 'text?',
      createdAt: 'ts',
      updatedAt: 'ts',
      shippedAt: 'ts?',
    },
    { references: { ownerId: 'students' } },
  ),
  define(
    'projectTasks',
    'project_tasks',
    {
      id: 'text',
      projectId: 'text',
      title: 'text',
      done: 'bool',
      dueDate: 'date?',
      doneAt: 'ts?',
      doneBy: 'text?',
      createdBy: 'text',
      createdAt: 'ts',
    },
    {
      references: {
        projectId: { table: 'projects', cascade: true },
        doneBy: 'students',
        createdBy: 'students',
      },
    },
  ),
  define(
    'projectMembers',
    'project_members',
    {
      id: 'text',
      projectId: 'text',
      studentId: 'text',
      role: 'text',
      joinedAt: 'ts',
    },
    {
      references: { projectId: { table: 'projects', cascade: true }, studentId: 'students' },
      unique: [['projectId', 'studentId']],
    },
  ),
  define(
    'joinRequests',
    'join_requests',
    {
      id: 'text',
      projectId: 'text',
      studentId: 'text',
      message: 'text',
      status: 'text',
      createdAt: 'ts',
      decidedAt: 'ts?',
    },
    { references: { projectId: { table: 'projects', cascade: true }, studentId: 'students' } },
  ),
  define(
    'events',
    'events',
    {
      id: 'text',
      title: 'text',
      organiser: 'text',
      description: 'text',
      eligibility: 'text',
      eligibleYears: 'int[]',
      skillIds: 'text[]',
      trackIds: 'text[]',
      effort: 'text',
      url: 'text?',
      verification: 'text',
      status: 'text',
      postedBy: 'text',
      createdAt: 'ts',
      reviewedBy: 'text?',
      reviewedAt: 'ts?',
      reviewNote: 'text',
      type: 'text',
      mode: 'text',
      location: 'text',
      startsOn: 'date',
      endsOn: 'date?',
      time: 'text',
      registerBy: 'date?',
      capacity: 'int?',
    },
    { references: { postedBy: 'users', reviewedBy: 'users' } },
  ),
  define(
    'jobs',
    'jobs',
    {
      id: 'text',
      title: 'text',
      organiser: 'text',
      description: 'text',
      eligibility: 'text',
      eligibleYears: 'int[]',
      skillIds: 'text[]',
      trackIds: 'text[]',
      effort: 'text',
      url: 'text?',
      verification: 'text',
      status: 'text',
      postedBy: 'text',
      createdAt: 'ts',
      reviewedBy: 'text?',
      reviewedAt: 'ts?',
      reviewNote: 'text',
      kind: 'text',
      mode: 'text',
      location: 'text',
      compensation: 'text',
      duration: 'text',
      deadline: 'date?',
      niceSkillIds: 'text[]',
    },
    { references: { postedBy: 'users', reviewedBy: 'users' } },
  ),
  define(
    'eventParticipation',
    'event_participation',
    {
      id: 'text',
      eventId: 'text',
      studentId: 'text',
      status: 'text',
      outcome: 'text?',
      reflection: 'text',
      skillIds: 'text[]',
      updatedAt: 'ts',
    },
    {
      references: { eventId: { table: 'events', cascade: true }, studentId: 'students' },
      unique: [['eventId', 'studentId']],
    },
  ),
  define(
    'applications',
    'applications',
    {
      id: 'text',
      jobId: 'text',
      studentId: 'text',
      stage: 'text',
      note: 'text',
      timeline: 'json',
      createdAt: 'ts',
      updatedAt: 'ts',
    },
    {
      references: { jobId: { table: 'jobs', cascade: true }, studentId: 'students' },
      unique: [['jobId', 'studentId']],
    },
  ),
  define(
    'dismissals',
    'dismissals',
    {
      id: 'text',
      studentId: 'text',
      key: 'text',
      kind: 'text',
      at: 'ts',
    },
    { references: { studentId: 'students' }, unique: [['studentId', 'key']] },
  ),
  define(
    'checkins',
    'checkins',
    {
      id: 'text',
      studentId: 'text',
      week: 'date',
      energy: 'int',
      stress: 'int',
      sleepHours: 'double',
      workload: 'int',
      enjoyment: 'int',
      note: 'text',
      createdAt: 'ts',
      updatedAt: 'ts',
    },
    { references: { studentId: 'students' }, unique: [['studentId', 'week']] },
  ),
  define(
    'connections',
    'connections',
    {
      id: 'text',
      studentId: 'text',
      provider: 'text',
      handle: 'text',
      url: 'text',
      showOnPortfolio: 'bool',
      consentAt: 'ts',
      lastSyncedAt: 'ts?',
      syncError: 'text?',
      github: 'json?',
    },
    { references: { studentId: 'students' }, unique: [['studentId', 'provider']] },
  ),
  define(
    'notifications',
    'notifications',
    {
      id: 'text',
      userId: 'text',
      kind: 'text',
      title: 'text',
      body: 'text',
      link: 'text?',
      dedupeKey: 'text?',
      createdAt: 'ts',
      readAt: 'ts?',
      dismissedAt: 'ts?',
    },
    { references: { userId: 'users' } },
  ),
  // `at` is text on purpose: a ledger line is dated to a day or to an instant,
  // and it must round-trip exactly or every recompute would rewrite the row.
  define(
    'momentum',
    'momentum',
    {
      id: 'text',
      studentId: 'text',
      source: 'text',
      refId: 'text',
      label: 'text',
      points: 'int',
      at: 'text',
    },
    { references: { studentId: 'students' } },
  ),
  define(
    'auditLogs',
    'audit_logs',
    {
      id: 'text',
      actorId: 'text',
      actorRole: 'text',
      action: 'text',
      entity: 'text',
      entityId: 'text',
      before: 'json?',
      after: 'json',
      at: 'ts',
    },
    { references: { actorId: 'users' } },
  ),
];

const SQL_TYPE: Record<Kind, string> = {
  text: 'text',
  int: 'integer',
  double: 'double precision',
  bool: 'boolean',
  date: 'date',
  ts: 'timestamptz',
  json: 'jsonb',
  'text[]': 'text[]',
  'int[]': 'integer[]',
};

/** `"oaa"."table"` — identifiers are always quoted, and never come from input. */
export const qualified = (table: string) => `"${DB_SCHEMA}"."${table}"`;
export const quote = (identifier: string) => `"${identifier}"`;

/**
 * Idempotent DDL: safe to run on every start. Creates the schema, tables,
 * constraints and indexes that are missing, and (re)applies the lockdown.
 */
export function schemaSql(): string {
  const statements: string[] = [`create schema if not exists ${quote(DB_SCHEMA)};`];
  const columnOf = (spec: TableSpec, field: string) =>
    spec.columns.find((column) => column.field === field)?.column ?? field;

  for (const spec of TABLES) {
    const columns = spec.columns.map((column) => {
      const primary = column.field === 'id' ? ' primary key' : '';
      const notNull = column.nullable || primary ? '' : ' not null';
      return `  ${quote(column.column)} ${SQL_TYPE[column.kind]}${primary}${notNull}`;
    });
    statements.push(
      `create table if not exists ${qualified(spec.table)} (\n${columns.join(',\n')}\n);`,
    );

    for (const fields of spec.unique) {
      const name = `${spec.table}_${fields.map(snake).join('_')}_key`;
      const list = fields.map((field) => quote(columnOf(spec, field))).join(', ');
      statements.push(
        `create unique index if not exists ${quote(name)} on ${qualified(spec.table)} (${list});`,
      );
    }

    for (const reference of spec.references) {
      const column = columnOf(spec, reference.field);
      const name = `${spec.table}_${column}_fkey`;
      // Postgres has no "add constraint if not exists", hence the guard.
      statements.push(
        [
          'do $$ begin',
          `  alter table ${qualified(spec.table)} add constraint ${quote(name)}`,
          `    foreign key (${quote(column)}) references ${qualified(reference.table)} ("id")`,
          `    ${reference.cascade ? 'on delete cascade ' : ''}deferrable initially deferred;`,
          'exception when duplicate_object then null;',
          'end $$;',
        ].join('\n'),
      );
      // Foreign keys are not indexed automatically; unindexed ones make every
      // parent delete scan the child table.
      statements.push(
        `create index if not exists ${quote(`${spec.table}_${column}_idx`)} on ${qualified(spec.table)} (${quote(column)});`,
      );
    }

    statements.push(`alter table ${qualified(spec.table)} enable row level security;`);
  }

  // Nobody but the backend's own role: no Data API access, no client access.
  statements.push(
    `revoke all on all tables in schema ${quote(DB_SCHEMA)} from anon, authenticated;`,
    `revoke usage on schema ${quote(DB_SCHEMA)} from anon, authenticated;`,
  );

  return statements.join('\n\n');
}

// --- Rows ⇄ database values ------------------------------------------------------

/** A domain row → the ordered parameter list for an insert. */
export function toParams(spec: TableSpec, row: Record<string, unknown>): unknown[] {
  return spec.columns.map((column) => {
    const value = row[column.field] ?? null;
    // jsonb must be sent as JSON text — node-postgres would turn a JS array into a
    // Postgres array literal otherwise.
    return column.kind === 'json' && value !== null ? JSON.stringify(value) : value;
  });
}

/** A database row (snake_case) → a domain row (camelCase). */
export function fromRecord(
  spec: TableSpec,
  record: Record<string, unknown>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const column of spec.columns) {
    const value = record[column.column];
    row[column.field] = value === undefined ? null : value;
  }
  return row;
}
