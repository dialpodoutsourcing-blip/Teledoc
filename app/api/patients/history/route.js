import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireApiUser } from '@/lib/auth/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const consultations = await prisma.consultation.findMany({
      where: { patientId: profile.id, status: 'COMPLETED' },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialization: true } },
        medicalRecord: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(consultations);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
