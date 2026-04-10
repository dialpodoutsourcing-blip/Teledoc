import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireApiUser } from '@/lib/auth/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { user, error } = await requireApiUser('PATIENT');
  if (error) return error;

  try {
    const { doctorId, scheduledAt, reason, type } = await request.json();

    const profile = await prisma.patientProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

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

    return NextResponse.json(appointment, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  const { user, error } = await requireApiUser('PATIENT');
  if (error) return error;

  try {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId: profile.id },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialization: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return NextResponse.json(appointments);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
