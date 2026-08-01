# OAA

Full-stack web app starter.

| Layer    | Stack                             | Dev URL               |
| -------- | --------------------------------- | --------------------- |
| Frontend | React 18 + TypeScript + Vite      | http://localhost:5173 |
| Backend  | Node + Express + TypeScript (ESM) | http://localhost:4000 |

## Getting started

```bash
npm install                 # installs both workspaces
cp .env.example .env         # then fill in values
npm run dev                  # runs backend + frontend together
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the backend, so
there are no CORS issues in development.

## Layout

```
.
├── frontend/               # React SPA
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx        # entry point
│       ├── App.tsx         # root component
│       ├── components/     # UI components
│       ├── lib/api.ts      # fetch wrapper for the backend
│       ├── styles/         # global CSS
│       └── types.ts        # shared client types
├── backend/                # REST API
│   └── src/
│       ├── server.ts       # http listener + graceful shutdown
│       ├── app.ts          # express app, middleware, route mounting
│       ├── config/env.ts   # validated environment variables
│       ├── routes/         # HTTP layer
│       ├── services/       # business logic (swap for real DB here)
│       ├── models/         # zod schemas + types
│       ├── middleware/     # error handling, 404
│       └── lib/            # HttpError, asyncHandler
├── docker-compose.yml      # optional: run both + Postgres
└── .github/workflows/ci.yml
```

## Scripts

Run from the repo root:

| Command             | What it does                           |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Backend and frontend in watch mode     |
| `npm run build`     | Type-checks and builds both workspaces |
| `npm start`         | Runs the built backend                 |
| `npm run typecheck` | Type-checks without emitting           |
| `npm run format`    | Prettier over the repo                 |

Target a single workspace with `npm run <script> --workspace=backend`.

## API

| Method  | Path                                             | Who        | Description                              |
| ------- | ------------------------------------------------ | ---------- | ---------------------------------------- |
| `GET`   | `/api/health`                                    | anyone     | Health check                             |
| `POST`  | `/api/auth/login`                                | anyone     | Sign in, returns a JWT                   |
| `GET`   | `/api/auth/me`                                   | signed in  | The current user                         |
| `GET`   | `/api/students/:id`                              | self/staff | Profile (`me` for the signed-in student) |
| `GET`   | `/api/students/:id/marks`                        | self/staff | Marks by semester, with SGPA and CGPA    |
| `GET`   | `/api/students/:id/attendance`                   | self/staff | Percentages, monthly trend, absences     |
| `GET`   | `/api/students/:id/oaa`                          | self/staff | Ability score, breakdown, trend          |
| `GET`   | `/api/students/:id/leaderboard?scope=&category=` | self/staff | Rankings, with the viewer's own row      |
| `GET`   | `/api/students/:id/timetable`                    | self/staff | Weekly grid for their section            |
| `GET`   | `/api/students/:id/announcements`                | self/staff | Notices addressed to them                |
| `GET`   | `/api/students/:id/events`                       | self/staff | Events with their registration state     |
| `GET`   | `/api/students/:id/assignments`                  | self/staff | Assignments with submission and grade    |
| `GET`   | `/api/teachers/me`                               | teacher    | Dashboard summary                        |
| `GET`   | `/api/teachers/me/classes`                       | teacher    | Assigned subject + section pairs         |
| `GET`   | `/api/teachers/students`                         | teacher    | Search within their own classes          |
| `GET`   | `/api/attendance?subjectId=&section=&date=`      | teacher    | Class roster for a date                  |
| `POST`  | `/api/attendance/bulk`                           | teacher    | Mark a whole class — `409` if repeated   |
| `PATCH` | `/api/attendance/:id`                            | teacher    | Correct one record, writes an audit row  |
| `GET`   | `/api/marks?subjectId=&section=`                 | teacher    | Marks grid for a class                   |
| `POST`  | `/api/marks`                                     | teacher    | First entry for a student and subject    |
| `PATCH` | `/api/marks/:id`                                 | teacher    | Update an entry, writes an audit row     |
| `GET`   | `/api/teachers/assessments?semester=`            | teacher    | Roster with each student's rating        |
| `POST`  | `/api/teachers/assessments/adaptability`         | teacher    | Rate all seven criteria, recomputes OAA  |
| `POST`  | `/api/teachers/records/social`                   | teacher    | Add a social record, recomputes OAA      |

Responses are `{ "data": ... }` on success and `{ "error": { "message": ... } }` on failure.

## Data

There is no database server. The backend persists to a single JSON document at
`backend/data/oaa-data.json` — gitignored, seeded on first run, loaded by
`backend/src/data/store.ts`. Delete the file to reseed.

`store.ts` is the seam: routes call services, services call the store, so replacing it
with a real database touches that file and the service queries and nothing above them.
`docker-compose.yml` includes a Postgres service if you want one locally.

## Environment variables

Copy `.env.example` to `.env` in each workspace. Only `VITE_`-prefixed variables reach the
browser — never put secrets in `frontend/.env`.
