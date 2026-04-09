require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const consultationRoutes = require('./routes/consultations');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/consultations', consultationRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── Socket.io Signaling Server ─────────────────────────────────────────────

// Track connected users: userId → socketId
const connectedUsers = new Map();
// Track doctors online status: doctorProfileId → socketId
const onlineDoctors = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ── Auth / Identity ──────────────────────────────────────────────────────
  socket.on('identify', ({ userId, role, profileId }) => {
    connectedUsers.set(userId, socket.id);
    socket.data.userId = userId;
    socket.data.role = role;
    socket.data.profileId = profileId;

    if (role === 'DOCTOR') {
      onlineDoctors.set(profileId, socket.id);
    }

    // Broadcast updated online doctors list
    io.emit('online_doctors', Array.from(onlineDoctors.keys()));
    console.log(`[Socket] Identified: ${role} userId=${userId}`);
  });

  // ── Nudge (instant consult request) ─────────────────────────────────────
  socket.on('nudge_doctor', ({ doctorProfileId, patientProfileId, patientName, appointmentId, reason }) => {
    const doctorSocketId = onlineDoctors.get(doctorProfileId);
    if (doctorSocketId) {
      io.to(doctorSocketId).emit('incoming_nudge', {
        patientProfileId,
        patientName,
        appointmentId,
        reason,
        fromSocketId: socket.id,
        patientUserId: socket.data.userId,
      });
      console.log(`[Nudge] ${patientName} → doctor ${doctorProfileId}`);
    } else {
      socket.emit('nudge_failed', { message: 'Doctor is not online' });
    }
  });

  // ── Doctor responds to nudge ─────────────────────────────────────────────
  socket.on('nudge_response', ({ accepted, patientUserId, roomId, consultationId, appointmentId }) => {
    const patientSocketId = connectedUsers.get(patientUserId);
    if (patientSocketId) {
      if (accepted) {
        io.to(patientSocketId).emit('nudge_accepted', { roomId, consultationId });
      } else {
        io.to(patientSocketId).emit('nudge_rejected', {});
      }
    }
  });

  // ── WebRTC Signaling ─────────────────────────────────────────────────────
  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.to(roomId).emit('peer_joined', { socketId: socket.id });
    console.log(`[Room] ${socket.id} joined room ${roomId}`);
  });

  socket.on('webrtc_offer', ({ roomId, offer, targetSocketId }) => {
    const target = targetSocketId || null;
    if (target) {
      io.to(target).emit('webrtc_offer', { offer, fromSocketId: socket.id });
    } else {
      socket.to(roomId).emit('webrtc_offer', { offer, fromSocketId: socket.id });
    }
  });

  socket.on('webrtc_answer', ({ roomId, answer, targetSocketId }) => {
    const target = targetSocketId || null;
    if (target) {
      io.to(target).emit('webrtc_answer', { answer, fromSocketId: socket.id });
    } else {
      socket.to(roomId).emit('webrtc_answer', { answer, fromSocketId: socket.id });
    }
  });

  socket.on('webrtc_ice_candidate', ({ roomId, candidate, targetSocketId }) => {
    const target = targetSocketId || null;
    if (target) {
      io.to(target).emit('webrtc_ice_candidate', { candidate, fromSocketId: socket.id });
    } else {
      socket.to(roomId).emit('webrtc_ice_candidate', { candidate, fromSocketId: socket.id });
    }
  });

  socket.on('leave_room', ({ roomId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit('peer_left', { socketId: socket.id });
  });

  // ── Call control ─────────────────────────────────────────────────────────
  socket.on('call_ended', ({ roomId }) => {
    socket.to(roomId).emit('call_ended');
  });

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const { userId, role, profileId, roomId } = socket.data;

    if (userId) connectedUsers.delete(userId);
    if (role === 'DOCTOR' && profileId) {
      onlineDoctors.delete(profileId);
      io.emit('online_doctors', Array.from(onlineDoctors.keys()));
    }
    if (roomId) {
      socket.to(roomId).emit('peer_left', { socketId: socket.id });
    }

    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 Telemedicine server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket signaling active\n`);
});
