# OAA

Full-stack web app starter.

| Layer    | Stack                                      | Dev URL                 |
| -------- | ------------------------------------------ | ----------------------- |
| Frontend | React 18 + TypeScript + Vite               | http://localhost:5173   |
| Backend  | Node + Express + TypeScript (ESM)          | http://localhost:4000   |

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

| Command              | What it does                                     |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Backend and frontend in watch mode                |
| `npm run build`      | Type-checks and builds both workspaces            |
| `npm start`          | Runs the built backend                            |
| `npm run typecheck`  | Type-checks without emitting                      |
| `npm run format`     | Prettier over the repo                            |

Target a single workspace with `npm run <script> --workspace=backend`.

## API

| Method   | Path              | Description        |
| -------- | ----------------- | ------------------ |
| `GET`    | `/api/health`     | Health check       |
| `GET`    | `/api/items`      | List items         |
| `GET`    | `/api/items/:id`  | Get one item       |
| `POST`   | `/api/items`      | Create item        |
| `PATCH`  | `/api/items/:id`  | Update item        |
| `DELETE` | `/api/items/:id`  | Delete item        |

Responses are `{ "data": ... }` on success and `{ "error": { "message": ... } }` on failure.

## Adding a database

`backend/src/services/itemService.ts` holds an in-memory `Map` so the app runs with zero
setup. Replace its method bodies with real queries and set `DATABASE_URL` in
`backend/.env`. `docker-compose.yml` includes a Postgres service if you want one locally.

## Environment variables

Copy `.env.example` to `.env` in each workspace. Only `VITE_`-prefixed variables reach the
browser — never put secrets in `frontend/.env`.
