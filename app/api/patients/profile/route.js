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

    return NextResponse.json(profile);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const { user, error } = await requireApiUser('PATIENT');
  if (error) return error;

  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      address,
      bloodType,
      allergies,
      medications,
      medicalHistory,
    } = await request.json();

    const profile = await prisma.patientProfile.update({
      where: { userId: user.id },
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        phone,
        address,
        bloodType,
        allergies,
        medications,
        medicalHistory,
      },
    });

    return NextResponse.json(profile);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
