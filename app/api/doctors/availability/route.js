import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireApiUser } from '@/lib/auth/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const { user, error } = await requireApiUser('DOCTOR');
  if (error) return error;

  try {
    const { isOnline } = await request.json();

    const profile = await prisma.doctorProfile.update({
      where: { userId: user.id },
      data: { isOnline },
    });

    return NextResponse.json({ isOnline: profile.isOnline });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
