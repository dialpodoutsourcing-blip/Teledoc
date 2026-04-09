const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// POST /api/appointments — patient books an appointment
router.post('/', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const { doctorId, scheduledAt, reason, type } = req.body;

    const profile = await prisma.patientProfile.findUnique({
      where: { userId: req.user.userId },
    });
    if (!profile) return res.status(404).json({ error: 'Patient profile not found' });

    const appointment = await prisma.appointment.create({
      data: {
        patientId: profile.id,
        doctorId,
        scheduledAt: new Date(scheduledAt),
        reason: reason || null,
        type: type === 'NUDGE' ? 'NUDGE' : 'SCHEDULED',
        status: 'PENDING',
      },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialization: true } },
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/appointments — patient sees own appointments
router.get('/', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: req.user.userId },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const appointments = await prisma.appointment.findMany({
      where: { patientId: profile.id },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialization: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/appointments/:id/status — doctor accepts/rejects
router.patch('/:id/status', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        patient: true,
        doctor: true,
      },
    });

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
