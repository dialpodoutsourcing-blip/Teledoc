# MediConnect — Telemedicine Platform

A full-stack, desktop-first telemedicine application with real-time video consultations, role-based access, appointment booking, and guided medical forms.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database ORM | Prisma |
| Database | PostgreSQL |
| Real-time | Socket.io (signaling) + WebRTC (video/audio) |
| Auth | JWT (jsonwebtoken + bcryptjs) |

## Prerequisites

- **Node.js** v18+
- **PostgreSQL** running locally (default port 5432)

## Quick Start

### 1. Database Setup

Create a PostgreSQL database named `telemedicine`:

```sql
CREATE DATABASE telemedicine;
```

### 2. Configure Environment

Edit `backend/.env` with your PostgreSQL credentials:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/telemedicine?schema=public"
JWT_SECRET="telemedicine-super-secret-jwt-key-2024"
PORT=4000
CLIENT_URL="http://localhost:5173"
```

### 3. Install Dependencies, Push Schema & Seed

```bash
# Install backend dependencies
cd backend
npm install

# Push Prisma schema to database
npx prisma db push

# Seed demo accounts (doctor + patient with full profiles)
npm run seed

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Run Both Servers

Open **two terminals**:

```bash
# Terminal 1 — Backend (port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

## Demo Credentials

Use the seeded accounts below after running `npm run seed`:

- Doctor: `doctor@demo.com` / `demo123`
- Patient: `patient@demo.com` / `demo123`

## Core Features

### 🔐 Authentication
- Register as Doctor or Patient
- JWT-based sessions (7-day expiry)
- Role-based route protection

### 👤 Patient
- Profile with medical history, allergies, medications
- View online doctors in real-time
- **Nudge** an available doctor for an instant call
- Book scheduled appointments
- View full consultation history with diagnoses

### 👨‍⚕️ Doctor
- Online / Offline availability toggle
- Live incoming nudge notifications
- Accept / Reject appointments and nudges
- Start video calls directly from dashboard

### 📞 Video Call (WebRTC)
- Peer-to-peer video and audio
- Socket.io for WebRTC signaling
- Mute / Camera toggle during call
- Live call timer

### 📋 Consultation Interface (Doctor view)
- **Left panel**: Patient profile auto-loaded (demographics, allergies, history)
- **Right panel**: Guided medical form (symptoms, duration, vital signs, clinical notes)
- Symptom quick-fill presets
- Auto-save form data every 1.5s

### 🧾 Disposition
- Required before ending call: Diagnosis, Recommendations, Prescription, Follow-up date
- Automatically saves to patient's medical record on submit

## Data Models

```
User → PatientProfile / DoctorProfile
Appointment (SCHEDULED | NUDGE)
Consultation (ACTIVE | COMPLETED)  → MedicalRecord
```

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/doctors
PATCH  /api/doctors/availability
GET    /api/doctors/appointments

GET    /api/patients/profile
PUT    /api/patients/profile
GET    /api/patients/history
GET    /api/patients/:id           (doctor only)

POST   /api/appointments
GET    /api/appointments
PATCH  /api/appointments/:id/status

POST   /api/consultations/start
GET    /api/consultations/room/:roomId
PUT    /api/consultations/:id
POST   /api/consultations/:id/disposition
GET    /api/consultations/doctor/history
```

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `identify` | Client → Server | Register user identity |
| `nudge_doctor` | Patient → Server | Send instant consult request |
| `incoming_nudge` | Server → Doctor | Notify doctor of request |
| `nudge_response` | Doctor → Server | Accept/reject nudge |
| `nudge_accepted/rejected` | Server → Patient | Outcome notification |
| `join_room` | Client → Server | Join WebRTC signaling room |
| `webrtc_offer/answer/ice_candidate` | Peer → Peer | WebRTC handshake |
| `call_ended` | Host → Peer | End call signal |
