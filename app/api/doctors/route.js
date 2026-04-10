import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireApiUser } from '@/lib/auth/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireApiUser();
  if (error) return error;

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

    return NextResponse.json(doctors);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
