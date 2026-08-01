# CLAUDE.md — Smart Student Management Portal (OAA)

## What this is

College portal with three roles: Student, Teacher, Admin.
The signature feature is the **OAA score** (Overall Ability Assessment).
Full specs in `docs/`. The build order is in `plans.md`.

## Stack — decided, do not change without asking

- Monorepo: npm workspaces (`frontend/`, `backend/`)
- Backend: Express 4 + TypeScript, **ESM** — relative imports MUST end in `.js`
- Frontend: React 18 + Vite 6 + TypeScript + Tailwind + React Router
- Persistence: **a JSON file, not a database.** Owner's decision — do not add
  Postgres, Prisma, SQLite or any other DB without asking.
- Auth: JWT + bcrypt + role-based access control
- Charts: Recharts
- Validation: zod (already a dependency — use it, don't add another)

## Current state — read before planning anything

Steps 0, 3, 4, 5, 6, 7 and 8 of `plans.md` are done. Step 1 was replaced by the
JSON store below; Step 2 (auth API) is built. Steps 10–14 are **half done** — the
student read side of all five is live, the staff write side is not. Step 9 (admin
console) is next, and it is the biggest remaining gap: `/admin/*` is entirely
`ComingSoon`.

- **Persistence is `backend/data/oaa-data.json`** — gitignored, seeded on first
  run, loaded by `backend/src/data/store.ts`. Delete the file to reseed.
  `store.ts` is the single seam: swapping in a real database touches that file
  and the service queries, nothing above them.
- **Auth is real.** `POST /api/auth/login` and `GET /api/auth/me`, bcrypt cost 10,
  JWT in `localStorage`. `mockAuth.ts` is gone; do not reintroduce it.
- **Live student pages:** `/student/profile`, `/student/marks`,
  `/student/attendance`, all reading `GET /api/students/me[/marks|/attendance]`.
- **Live teacher pages:** `/teacher` (real dashboard), `/teacher/classes`,
  `/teacher/attendance`, `/teacher/marks`, `/teacher/students`,
  `/teacher/students/:studentId` and `/teacher/assessments`. Backed by
  `/api/teachers/*`, `/api/attendance/*` and `/api/marks/*`.
- **The OAA feature is live:** `/student/oaa` reads `GET /api/students/me/oaa`.
  See the OAA section below and `docs/07-oaa-spec.md`.
- **Every student sidebar item is built.** Leaderboard, timetable, announcements,
  events and assignments each read `GET /api/students/me/*` and are served from
  seeded rows — none of them hold hardcoded arrays.
- **The seed carries 10 students.** `22CS007` deliberately has no physical
  records — that is the missing-data rule visible in the running app, not just in
  a test. Don't "fix" it.
- Everything else is routed but unbuilt and renders `ComingSoon`.
- Do **not** spread mock data anywhere. A feature page that needs data it cannot
  get yet stays empty until its backend step.

### The teacher authorisation model (Step 6)

A **class** is one `(subject, section)` pair, listed in the `teacherAssignments`
table. It is the only unit of authority in the write path:

- `assertOwnsClass` in `teacher.service.ts` is the single check. Every write goes
  through it — a subject id sent by the client can never widen what a teacher
  may touch, and the class picker in the UI is built from the same list.
- Two teachers are seeded on purpose (`TCH01` owns CS501–503, `TCH02` owns
  CS504–505), so that a check which passes for everything is visibly broken.
- Attendance is editable from 30 days back (`ATTENDANCE_BACKDATE_DAYS`) to today,
  never into the future.
- A repeat bulk submission for the same `(subject, section, date)` is a **409**,
  checked before anything is written — a partially-applied batch is impossible.
- Every teacher write appends to `auditLogs` via `recordAudit`. The table is
  append-only; a correction is a new row, never an edit.

## Existing patterns — REUSE, never reinvent

- `backend/src/lib/asyncHandler.ts` — wrap every async route handler
- `backend/src/lib/httpError.ts` — throw `HttpError.notFound()`, `.forbidden()`, etc.
- `backend/src/middleware/errorHandler.ts` — already converts ZodError → 400. Do not
  add try/catch in routes for validation.
- `backend/src/config/env.ts` — all env vars go through this zod schema. Never read
  `process.env` directly anywhere else.
- `backend/src/middleware/requireAuth.ts` — `requireAuth`, `requireRole`,
  `requireSelfOrStaff`. Guard every new protected route with these; never
  hand-roll an ownership check in a handler.
- `backend/src/lib/grading.ts` — grade bands, grade points, credit-weighted means
- `backend/src/services/audit.service.ts` — `recordAudit` for every staff write
- `frontend/src/lib/api.ts` — the only place `fetch` is called
- `frontend/src/lib/useApi.ts` — the loading / error / data hook every page uses
- `frontend/src/pages/teacher/useClassSelection.ts` — the teacher's class picker
  state, kept in the query string so a class survives a reload or a deep link
- Route file → service file → store. Routes never touch `getDb()` directly.

### The OAA engine (Steps 7 and 8)

- `backend/src/lib/oaa.ts` is **pure** — numbers in, numbers out, no store access.
  That is what makes it testable without fixtures. Keep it that way: anything
  needing rows belongs in `oaa.service.ts`.
- **Tests come before UI here.** A wrong chart is obvious; a wrong score quietly
  ranks the wrong student first. 33 tests in `oaa.test.ts` — run them after any
  change to the formula, the bands or the dimension mappings.
- **Recompute on write, never on read.** `getOaa` serves the stored `oaaScores`
  row. Every write to an input calls `recomputeStudent`.
- **The weights live in `settings`, never in code.** `DEFAULT_WEIGHTS` is the
  seed's starting value and the tests' fixture — not a fallback the service reads.
- **`null` means "not measured" and is never rendered as 0**, in a number or a
  chart. The missing dimension is dropped and the divisor renormalised; the API
  returns `measured` / `missing` so the UI can say which.
- Values marked ⚠️ in `docs/07-oaa-spec.md` are invented placeholders standing in
  for college regulations. Treat them as provisional.

## Non-negotiable rules

1. **ESM imports need `.js`**: `import { x } from './foo.js'` even though the file is `foo.ts`.
2. **Never store a plaintext password.** bcrypt, cost 10+.
3. **Never build SQL by string concatenation.** If a real database is ever added,
   it is Prisma or parameterized queries only.
4. **Every protected route checks role AND ownership.** A student requesting
   `/api/students/42/marks` must be verified as student 42, not just "a student".
5. **Validate every request body with a zod schema** in the model file.
6. **Never commit `.env`.** Secrets go in `.env`, placeholders in `.env.example`.
7. **API responses are always** `{ data: ... }` **or** `{ error: { message } }`.

## Domain rules

- OAA = (Academic + Adaptability + Physical + 0.5 × Social) / 3.5 → range 0–100
- Round to nearest integer BEFORE grade lookup (95.4 → 95 → A; 95.6 → 96 → A+)
- A dimension with no records is dropped and the divisor renormalised — never
  scored as 0, and never filled in from the cohort average
- Attendance is one row per student, per subject, per DATE. Never a running counter.
- OAA, CGPA, and attendance % are DERIVED. Never hand-edit them as stored columns.
- Teacher-assigned scores (Adaptability, Social) must write an `audit_logs` row.

## Frontend conventions

- Tailwind v4 — configured in `frontend/src/styles/global.css` via `@theme`.
  Brand tokens are `brand-*` / `ink-*`; use them instead of raw hex.
- Three typefaces, self-hosted via `@fontsource` (no CDN, works offline, no
  third-party request on a student's behalf): **Newsreader** for headings and
  every figure, **Inter** for body and tables, **IBM Plex Mono** for the `kicker`
  and for codes. Use `font-serif` / `font-sans` / `font-mono`, never a raw family.
- Path alias `@` → `frontend/src`. Prefer `@/components/...` over `../../`.
- Route groups: public (`/`, `/login`), `/student/*`, `/teacher/*`, `/admin/*`.
  Every non-public route sits inside `<ProtectedRoute>`.
- Shared UI lives in `frontend/src/components/ui/` — `Loading`, `ErrorMessage`,
  `EmptyState`, `Button`. Use them rather than writing another spinner.
- Chart colours come from `pages/student/oaa/chartTokens.ts`, and each one was
  checked with a contrast validator rather than picked by eye — the measured
  ratios are in the comments. Marks need ≥3:1 on the white card; axis text needs
  ≥4.5:1. Gridlines are the exception: recessive by design.
- A page that saves shows the outcome. Two ways that gets silently broken, both
  hit during Steps 6–8:
  1. Clearing the notice inside the effect that reruns on refetch — the refetch is
     what follows a save, so it deletes the message it was meant to confirm.
  2. Holding the notice in a component that the refetch unmounts. `useApi` blanks
     `data` while refetching, so anything rendered under `{data && …}` is torn
     down. Lift the notice above that boundary.

## Commands

- `npm run dev` — both servers
- `npm run typecheck` — must pass before any commit
- `npm test` — backend tests
- `npm run format` — prettier

## Before you finish any task

Run `npm run typecheck`. If it fails, fix it — don't hand back broken code.
