import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireApiUser } from '@/lib/auth/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { user, error } = await requireApiUser('DOCTOR');
  if (error) return error;

  try {
    const profile = await prisma.doctorProfile.findUnique({
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
  const { user, error } = await requireApiUser('DOCTOR');
  if (error) return error;

  try {
    const { firstName, lastName, specialization, licenseNumber, phone, bio } = await request.json();

    const profile = await prisma.doctorProfile.update({
      where: { userId: user.id },
      data: { firstName, lastName, specialization, licenseNumber, phone, bio },
    });

    return NextResponse.json(profile);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
