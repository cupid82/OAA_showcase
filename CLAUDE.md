# CLAUDE.md — Smart Student Management Portal (OAA)

## What this is

College portal with three roles: Student, Teacher, Admin.
The signature feature is the **OAA score** (Overall Ability Assessment).
Full specs in `docs/`. The build order is in `plans.md`.

## Stack — decided, do not change without asking

- Monorepo: npm workspaces (`frontend/`, `backend/`)
- Backend: Express 4 + TypeScript, **ESM** — relative imports MUST end in `.js`
- Frontend: React 18 + Vite 6 + TypeScript + Tailwind + React Router
- Database: PostgreSQL via Prisma
- Auth: JWT + bcrypt + role-based access control
- Charts: Recharts
- Validation: zod (already a dependency — use it, don't add another)

## Current state — read before planning anything

Steps 0, 3 and 4 of `plans.md` are done. Steps 1 (database) and 2 (auth API) are
**deliberately deferred** — the owner will do them later.

That means, right now:

- There is **no database and no Prisma**. Nothing persists.
- There is **no `/api/auth/*` backend**. The only backend route is `/api/health`.
- The frontend auth flow runs on a **mock provider** at
  `frontend/src/lib/mockAuth.ts` — three demo accounts, resolved locally.
  `frontend/src/context/AuthContext.tsx` is the single seam: when the real
  endpoints exist, swap the two calls inside it for `api.post('/api/auth/login')`
  and `api.get('/api/auth/me')` and delete `mockAuth.ts`. Nothing else changes.
- Do **not** spread mock data anywhere else. Feature pages that need real data
  wait for their backend step.

## Existing patterns — REUSE, never reinvent

- `backend/src/lib/asyncHandler.ts` — wrap every async route handler
- `backend/src/lib/httpError.ts` — throw `HttpError.notFound()`, `.forbidden()`, etc.
- `backend/src/middleware/errorHandler.ts` — already converts ZodError → 400. Do not
  add try/catch in routes for validation.
- `backend/src/config/env.ts` — all env vars go through this zod schema. Never read
  `process.env` directly anywhere else.
- `frontend/src/lib/api.ts` — the only place `fetch` is called
- Route file → service file → database. Routes never query the DB directly.

## Non-negotiable rules

1. **ESM imports need `.js`**: `import { x } from './foo.js'` even though the file is `foo.ts`.
2. **Never store a plaintext password.** bcrypt, cost 10+.
3. **Never build SQL by string concatenation.** Prisma or parameterized queries only.
4. **Every protected route checks role AND ownership.** A student requesting
   `/api/students/42/marks` must be verified as student 42, not just "a student".
5. **Validate every request body with a zod schema** in the model file.
6. **Never commit `.env`.** Secrets go in `.env`, placeholders in `.env.example`.
7. **API responses are always** `{ data: ... }` **or** `{ error: { message } }`.

## Domain rules

- OAA = (Academic + Adaptability + Physical + 0.5 × Social) / 3.5 → range 0–100
- Round to nearest integer BEFORE grade lookup (95.4 → 95 → A; 95.6 → 96 → A+)
- Attendance is one row per student, per subject, per DATE. Never a running counter.
- OAA, CGPA, and attendance % are DERIVED. Never hand-edit them as stored columns.
- Teacher-assigned scores (Adaptability, Social) must write an `audit_logs` row.

## Frontend conventions

- Tailwind v4 — configured in `frontend/src/styles/global.css` via `@theme`.
  Brand tokens are `brand-*` / `ink-*`; use them instead of raw hex.
- Path alias `@` → `frontend/src`. Prefer `@/components/...` over `../../`.
- Route groups: public (`/`, `/login`), `/student/*`, `/teacher/*`, `/admin/*`.
  Every non-public route sits inside `<ProtectedRoute>`.
- Shared UI lives in `frontend/src/components/ui/` — `Loading`, `ErrorMessage`,
  `EmptyState`. Use them rather than writing another spinner.

## Commands

- `npm run dev` — both servers
- `npm run typecheck` — must pass before any commit
- `npm test` — backend tests
- `npm run format` — prettier

## Before you finish any task

Run `npm run typecheck`. If it fails, fix it — don't hand back broken code.
