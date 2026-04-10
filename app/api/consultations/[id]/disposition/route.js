import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireApiUser } from '@/lib/auth/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { error } = await requireApiUser('DOCTOR');
  if (error) return error;

  try {
    const { diagnosis, recommendations, prescription, followUpDate, symptoms, duration, notes } = await request.json();

    if (!diagnosis) {
      return NextResponse.json(
        { error: 'Diagnosis is required before ending consultation' },
        { status: 400 }
      );
    }

    const consultation = await prisma.consultation.update({
      where: { id: params.id },
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

    if (consultation.appointmentId) {
      await prisma.appointment.update({
        where: { id: consultation.appointmentId },
        data: { status: 'COMPLETED' },
      });
    }

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: consultation.patientId,
        consultationId: consultation.id,
        title: `Consultation - ${new Date().toLocaleDateString()}`,
        summary: `Diagnosis: ${diagnosis}. ${recommendations ? `Recommendations: ${recommendations}.` : ''} ${prescription ? `Prescription: ${prescription}.` : ''}`,
      },
    });

    return NextResponse.json({ consultation, medicalRecord: record });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
