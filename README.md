# MediConnect

MediConnect is now a single root-level Next.js app for Vercel and Supabase. It keeps Prisma on Supabase Postgres for app data, uses Supabase Auth for login/session management, and uses Supabase Realtime plus WebRTC for the 1-on-1 video demo.

## Current scope

- Email/password registration and login with Supabase Auth
- Doctor and patient dashboards
- Doctor discovery
- Appointment booking and doctor-side accept/reject flows
- Patient history and doctor consultation history
- A simple authenticated 1-on-1 video room demo at `/consultation/[roomId]`

## Stack

- Next.js App Router
- React 18
- Prisma
- Supabase Auth
- Supabase Postgres
- Supabase Realtime
- WebRTC

## Environment variables

Copy `.env.example` to `.env` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only and is used for demo/bootstrap provisioning.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for login and the video room.
- `DATABASE_URL` should point Prisma at your Supabase Postgres database.

## Local development

1. Install dependencies.

```bash
npm install
```

2. Generate the Prisma client and apply the schema.

```bash
npx prisma generate
npx prisma db push
```

3. Seed demo users and sample data.

```bash
npm run seed
```

`npm run seed` requires `SUPABASE_SERVICE_ROLE_KEY` so the demo auth users can be created and confirmed through Supabase Admin.

4. Start the app.

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo credentials

After seeding:

- Doctor: `doctor@demo.com` / `demo123`
- Patient: `patient@demo.com` / `demo123`

If email confirmation is enabled in your Supabase project and you do not use the service-role seed flow, newly created users must confirm their email before first login.

## Video demo flow

1. Sign in as any authenticated user.
2. Use the `1-on-1 Video Demo` card on the doctor or patient dashboard.
3. Create a room or enter an existing room ID.
4. Open the same room in a second browser or device.
5. On the receiving side, click `Join Call / Answer`.
6. On the calling side, click `Start Call`.

If the caller starts before the second participant is ready, just start the call again after the other side has joined the room.

## Realtime signaling

Each room uses one Supabase Realtime broadcast channel:

- Channel: `video-room-{roomId}`
- Event: `signal`

Payload shape:

```json
{
  "type": "offer | answer | ice-candidate",
  "data": {},
  "senderId": "unique-browser-instance-id"
}
```

## Deployment

Deploy one Vercel project from the repo root.

- Framework preset: `Next.js`
- Root directory: repository root

Set these Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`

Notes:

- `postinstall` runs `prisma generate`
- Node is pinned to `20.x`
- Seed/bootstrap is manual and should not run automatically on deploy

## API overview

```text
GET    /api/health
GET    /api/session/me

GET    /api/doctors
GET    /api/doctors/profile
PUT    /api/doctors/profile
PATCH  /api/doctors/availability
GET    /api/doctors/appointments

GET    /api/patients/profile
PUT    /api/patients/profile
GET    /api/patients/history
GET    /api/patients/:id

POST   /api/appointments
GET    /api/appointments
PATCH  /api/appointments/:id/status

POST   /api/consultations/start
GET    /api/consultations/room/:roomId
GET    /api/consultations/:id
PUT    /api/consultations/:id
POST   /api/consultations/:id/disposition
GET    /api/consultations/doctor/history
```
