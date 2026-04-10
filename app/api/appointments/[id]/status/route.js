import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireApiUser } from '@/lib/auth/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const { error } = await requireApiUser('DOCTOR');
  if (error) return error;

  try {
    const { status } = await request.json();
    const validStatuses = ['ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: { status },
      include: {
        patient: true,
        doctor: true,
      },
    });

    return NextResponse.json(appointment);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
