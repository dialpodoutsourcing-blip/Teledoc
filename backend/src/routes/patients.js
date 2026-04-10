const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = require('../lib/prisma');

// GET /api/patients/profile  — get own profile
router.get('/profile', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: req.user.userId },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/patients/profile — update own profile
router.put('/profile', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const {
      firstName, lastName, dateOfBirth, gender, phone,
      address, bloodType, allergies, medications, medicalHistory
    } = req.body;

    const profile = await prisma.patientProfile.update({
      where: { userId: req.user.userId },
      data: {
        firstName, lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender, phone, address, bloodType, allergies, medications, medicalHistory
      },
    });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/patients/history — patient sees own consultation history
// NOTE: Must be defined BEFORE /:id to avoid Express catching "history" as an id param
router.get('/history', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: req.user.userId },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const consultations = await prisma.consultation.findMany({
      where: { patientId: profile.id, status: 'COMPLETED' },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialization: true } },
        medicalRecord: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(consultations);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/patients/:id — doctor reads patient profile (during consultation)
router.get('/:id', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const profile = await prisma.patientProfile.findUnique({
      where: { id: req.params.id },
      include: {
        medicalRecords: {
          include: { consultation: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!profile) return res.status(404).json({ error: 'Patient not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
