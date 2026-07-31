# 06 — Security & Technologies

> ⚠️ Outline only. Paste your Obsidian note 06 over this file.
> Used by Step 15 (hardening & deploy).

## Authentication

- JWT, 24h expiry, secret from `backend/src/config/env.ts`.
- bcrypt cost 12. No plaintext password anywhere, ever.
- Rate limit on `/api/auth/login`.
- TODO: refresh tokens, or re-login after 24h?
- TODO: where does the token live on the client — localStorage or httpOnly cookie?
  (Current frontend uses localStorage. Revisit at Step 15.)

## Authorization

- `requireAuth` → 401 without a valid token.
- `requireRole(...)` → 403 on role mismatch.
- `requireSelfOrStaff` → a student may only read their own records; staff bypass.
- Every protected route checks **role AND ownership**.

## Input handling

- Every request body validated by a zod schema in the model file.
- No SQL built by string concatenation. Prisma or parameterized queries only.
- File uploads: type and size limits. TODO: decide storage (Cloudinary vs local).

## Transport & headers

- helmet configured.
- CORS locked to the real frontend origin in production — never `*`.
- HTTPS only in production.

## Data handling

- No secret is ever sent to the frontend.
- No `console.log` of user data.
- Leaderboard privacy toggle in admin settings.

## Audit

- Every mutation by staff writes an `audit_logs` row.

## Step 15 checklist

- [ ] Every route re-verified for auth + role + ownership
- [ ] Every body zod-validated
- [ ] CORS locked down
- [ ] Rate limits in place
- [ ] Production env var checklist complete
- [ ] Secrets rotated before going live
