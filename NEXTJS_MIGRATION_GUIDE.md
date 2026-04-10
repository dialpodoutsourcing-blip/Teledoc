# Next.js Migration Guide

This file is the implementation source of truth for the Next.js cutover of MediConnect.

## Frozen Decisions

- Single root-level Next.js app
- Next.js App Router
- JavaScript, not TypeScript
- Supabase Auth for credentials and sessions
- Prisma on Supabase Postgres for app data
- Supabase Realtime for video signaling
- Full phase-one parity:
  - auth
  - registration
  - doctor dashboard
  - patient dashboard
  - appointments
  - consultation history
  - 1-on-1 video demo

## Target Architecture

- `app/`
  - routes and route handlers
- `components/`
  - reusable client components and page-level client shells
- `hooks/`
  - client hooks such as the video room hook
- `lib/`
  - Prisma client
  - Supabase browser/server/admin clients
  - auth guards and session bootstrap helpers
- `prisma/`
  - schema and seed/bootstrap logic
- `scripts/`
  - manual operational scripts if needed

## Old To New Route Map

- `/` -> `app/page.js`
- `/login` -> `app/login/page.js`
- `/register` -> `app/register/page.js`
- `/doctor` -> `app/doctor/page.js`
- `/patient` -> `app/patient/page.js`
- `/consultation/:roomId` -> `app/consultation/[roomId]/page.js`

## Old To New Env Map

- legacy public Supabase URL env -> `NEXT_PUBLIC_SUPABASE_URL`
- legacy public Supabase anon key env -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- legacy frontend API base env -> removed
- legacy custom auth secret env -> removed
- legacy CORS origin env -> removed
- new:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL`
  - `NEXT_PUBLIC_APP_URL`

## Data Ownership Rules

- Supabase Auth owns:
  - login
  - signup
  - logout
  - session cookies
  - auth user identity
- Prisma owns:
  - app user role
  - patient profile
  - doctor profile
  - appointments
  - consultations
  - medical records

## Auth Flow Spec

### Signup

- Client signs up with Supabase Auth email/password.
- Signup sends profile bootstrap fields in `user_metadata`.
- First authenticated app hydration creates the Prisma user/profile if it does not exist yet.

### Login

- Client signs in with Supabase Auth email/password.
- App hydrates the session from `/api/session/me`.

### Logout

- Client signs out with Supabase Auth.
- Local app user state is cleared.

### Session Hydration

- `GET /api/session/me`
  - reads Supabase session from cookies
  - fetches the auth user
  - bootstraps missing Prisma user/profile from auth metadata if needed
  - returns app user + role + profile

### Prisma User Bootstrap

- `User.id` must match the Supabase auth user id.
- Missing Prisma user is created from:
  - auth user id
  - auth email
  - auth metadata role
  - auth metadata profile fields

### Demo User Provisioning

- Manual seed/bootstrap uses:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Supabase Admin API for auth users
  - Prisma upserts for app data
- Demo credentials remain:
  - `doctor@demo.com / demo123`
  - `patient@demo.com / demo123`

## Migration Phases

### 1. Scaffold Root Next App

- Add root `package.json`
- Add App Router entry files
- Add global CSS
- Add root env example
- Add Prisma root location

### 2. Wire Supabase Auth + Prisma

- Add browser/server/admin Supabase clients
- Add middleware session refresh
- Add auth provider
- Add session hydration route
- Add role guards

### 3. Port API Handlers

- Port doctors routes
- Port patients routes
- Port appointments routes
- Port consultations routes
- Add health route

### 4. Port Pages And Components

- Port login and register
- Port dashboards
- Port shared modal/components
- Port auth-aware redirects

### 5. Port Video Room

- Keep client-only WebRTC implementation
- Keep Supabase Realtime signaling
- Preserve the current room-based flow

### 6. Cut Over And Delete Legacy Folders

- Remove the legacy frontend folder
- Remove the legacy backend folder
- Remove Vite files and env names
- Remove Express runtime files

## Do Not Drift

- Do not add new work to the legacy frontend folder
- Do not add new work to the legacy backend folder
- Do not reintroduce Vite config
- Do not reintroduce Express runtime
- Do not convert to TypeScript during this migration
- Do not add JWT auth back into the app

## Definition Of Done

- Root `next build` succeeds
- All runtime code lives in the root Next app
- Supabase Auth login/register/logout work
- Prisma CRUD routes work under Next route handlers
- Doctor and patient flows work
- Video demo works with Supabase Realtime
- Demo accounts can be provisioned manually
- No runtime dependency remains on the legacy frontend or backend folders

## Manual QA Checklist

- Register a new patient
- Register a new doctor
- Login as doctor
- Login as patient
- Update both profiles
- Book an appointment
- Accept and reject appointments as doctor
- View patient history
- View doctor consultation history
- Open the same consultation room in two browsers
- Confirm local and remote video render
- Confirm demo accounts still sign in
