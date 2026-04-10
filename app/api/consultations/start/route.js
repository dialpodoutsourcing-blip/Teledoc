import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireApiUser } from '@/lib/auth/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { user, error } = await requireApiUser('DOCTOR');
  if (error) return error;

  try {
    const { appointmentId, patientId, roomId } = await request.json();

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

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

    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'ACCEPTED' },
      });
    }

    return NextResponse.json(consultation, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
