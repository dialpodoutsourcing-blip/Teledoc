# MediConnect

A full-stack telemedicine app with a React/Vite frontend and an Express/Prisma backend.

## Current demo scope

This repo now includes a simple 1-on-1 video room demo using:

- WebRTC for peer-to-peer audio/video
- Supabase Realtime broadcast channels for signaling
- Express for REST APIs only

The live video demo is intentionally lightweight:

- It uses manual room IDs
- It reuses `/consultation/:roomId` as the video room
- It does not use Socket.IO
- It does not save consultation notes from the live room itself

Existing REST features remain available:

- Authentication and registration
- Patient and doctor profiles
- Doctor browsing
- Appointment booking and management
- Consultation history and medical records

## Tech stack

- Frontend: React 18 + Vite
- Backend: Express
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT + bcryptjs
- Live video demo: WebRTC + Supabase Realtime

## Demo credentials

Seed the database, then use:

- Doctor: `doctor@demo.com` / `demo123`
- Patient: `patient@demo.com` / `demo123`

## Local development

### 1. Create the database

Create a PostgreSQL database named `telemedicine`.

### 2. Configure environment files

Backend:

Copy `backend/.env.example` to `backend/.env` and set:

- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `PORT`

Frontend:

Copy `frontend/.env.example` to `frontend/.env` and set:

- `VITE_API_BASE_URL=`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Notes:

- Leave `VITE_API_BASE_URL` blank in local development to use the Vite `/api` proxy.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required for the video room demo.

### 3. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 4. Push Prisma schema and seed demo data

```bash
cd backend
npx prisma db push
npm run seed
```

### 5. Run both apps

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Video demo flow

1. Sign in as any authenticated user.
2. Use the `1-on-1 Video Demo` card on the doctor or patient dashboard.
3. Create a room or enter an existing room ID.
4. Open the same room in a second browser or device.
5. On the receiving side, click `Join Call / Answer`.
6. On the calling side, click `Start Call`.

If the caller starts before the other participant has joined, just click `Start Call` again after the second participant is ready.

## Supabase Realtime signaling

The frontend uses one Supabase Realtime broadcast channel per room:

- Channel name: `video-room-{roomId}`
- Broadcast event: `signal`

Signal payload shape:

```json
{
  "type": "offer | answer | ice-candidate",
  "data": {},
  "senderId": "unique-browser-instance-id"
}
```

## Deployment

This repo can still be deployed as two separate Vercel projects:

- Frontend project
  - Root directory: `frontend`
  - Framework preset: `Vite`
- Backend project
  - Root directory: `backend`
  - Framework preset: `Express`

### Frontend environment variables

- `VITE_API_BASE_URL=https://YOUR-BACKEND-PROJECT.vercel.app/api`
- `VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co`
- `VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY`

### Backend environment variables

- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS=https://YOUR-FRONTEND-PROJECT.vercel.app`
- `NODE_ENV=production`

Notes:

- `postinstall` runs `prisma generate`
- Node is pinned to `20.x`
- Prisma seed data is a manual development task and is not run automatically during deploys
- Express is not used for websocket signaling

## API overview

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

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
