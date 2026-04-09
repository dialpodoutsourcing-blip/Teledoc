const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// NOTE: All specific named routes (/start, /room/:id, /doctor/history) must be
// registered BEFORE the generic /:id route to avoid Express param matching errors.

// POST /api/consultations/start — doctor starts a consultation from appointment
router.post('/start', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { appointmentId, patientId, roomId } = req.body;

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.userId },
    });
    if (!doctorProfile) return res.status(404).json({ error: 'Doctor profile not found' });

    const consultation = await prisma.consultation.create({
      data: {
        appointmentId: appointmentId || undefined,
        patientId,
        doctorId: doctorProfile.id,
        roomId,
        status: 'ACTIVE',
      },
      include: {
        patient: true,
        doctor: true,
        appointment: true,
      },
    });

    // If from appointment, mark it accepted
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'ACCEPTED' },
      });
    }

    res.status(201).json(consultation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/consultations/:id — get consultation details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const consultation = await prisma.consultation.findUnique({
      where: { id: req.params.id },
      include: {
        patient: {
          include: {
            medicalRecords: {
              include: { consultation: { select: { diagnosis: true, startedAt: true } } },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        doctor: true,
        appointment: true,
      },
    });
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
    res.json(consultation);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/consultations/room/:roomId — get by room ID
router.get('/room/:roomId', authenticate, async (req, res) => {
  try {
    const consultation = await prisma.consultation.findUnique({
      where: { roomId: req.params.roomId },
      include: {
        patient: {
          include: {
            medicalRecords: {
              include: { consultation: { select: { diagnosis: true, startedAt: true } } },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        doctor: true,
        appointment: true,
      },
    });
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
    res.json(consultation);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/consultations/:id — update form fields during call
router.put('/:id', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { symptoms, duration, notes, vitalSigns } = req.body;
    const consultation = await prisma.consultation.update({
      where: { id: req.params.id },
      data: {
        symptoms: symptoms ?? undefined,
        duration: duration ?? undefined,
        notes: notes ?? undefined,
        vitalSigns: vitalSigns ?? undefined,
      },
    });
    res.json(consultation);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/consultations/:id/disposition — doctor submits final disposition & ends call
router.post('/:id/disposition', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { diagnosis, recommendations, prescription, followUpDate, symptoms, duration, notes } = req.body;

    if (!diagnosis) {
      return res.status(400).json({ error: 'Diagnosis is required before ending consultation' });
    }

    const consultation = await prisma.consultation.update({
      where: { id: req.params.id },
      data: {
        diagnosis,
        recommendations: recommendations || null,
        prescription: prescription || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        symptoms: symptoms || undefined,
        duration: duration || undefined,
        notes: notes || undefined,
        endedAt: new Date(),
        status: 'COMPLETED',
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    // Update appointment status
    if (consultation.appointmentId) {
      await prisma.appointment.update({
        where: { id: consultation.appointmentId },
        data: { status: 'COMPLETED' },
      });
    }

    // Create medical record
    const record = await prisma.medicalRecord.create({
      data: {
        patientId: consultation.patientId,
        consultationId: consultation.id,
        title: `Consultation — ${new Date().toLocaleDateString()}`,
        summary: `Diagnosis: ${diagnosis}. ${recommendations ? `Recommendations: ${recommendations}.` : ''} ${prescription ? `Prescription: ${prescription}.` : ''}`,
      },
    });

    res.json({ consultation, medicalRecord: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/consultations/doctor/history — doctor sees past consultations
router.get('/doctor/history', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.userId },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const consultations = await prisma.consultation.findMany({
      where: { doctorId: profile.id, status: 'COMPLETED' },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(consultations);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
