const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../lib/prisma');

// GET /api/doctors — list all online doctors (for patients to nudge)
router.get('/', authenticate, async (req, res) => {
  try {
    const doctors = await prisma.doctorProfile.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true,
        isOnline: true,
        bio: true,
      },
      orderBy: { isOnline: 'desc' },
    });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/doctors/profile — doctor reads own profile
router.get('/profile', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.userId },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/doctors/profile — doctor updates profile
router.put('/profile', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { firstName, lastName, specialization, licenseNumber, phone, bio } = req.body;
    const profile = await prisma.doctorProfile.update({
      where: { userId: req.user.userId },
      data: { firstName, lastName, specialization, licenseNumber, phone, bio },
    });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/doctors/availability — toggle online/offline
router.patch('/availability', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { isOnline } = req.body;
    const profile = await prisma.doctorProfile.update({
      where: { userId: req.user.userId },
      data: { isOnline },
    });
    res.json({ isOnline: profile.isOnline });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/doctors/appointments — doctor sees own appointments
router.get('/appointments', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.userId },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const appointments = await prisma.appointment.findMany({
      where: { doctorId: profile.id },
      include: {
        patient: { select: { firstName: true, lastName: true, gender: true, dateOfBirth: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
