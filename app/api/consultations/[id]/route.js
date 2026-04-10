import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireApiUser } from '@/lib/auth/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { error } = await requireApiUser();
  if (error) return error;

  try {
    const consultation = await prisma.consultation.findUnique({
      where: { id: params.id },
      include: {
        patient: {
          include: {
            medicalRecords: {
              include: {
                consultation: {
                  select: { diagnosis: true, startedAt: true },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        doctor: true,
        appointment: true,
      },
    });

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }

    return NextResponse.json(consultation);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { error } = await requireApiUser('DOCTOR');
  if (error) return error;

  try {
    const { symptoms, duration, notes, vitalSigns } = await request.json();

    const consultation = await prisma.consultation.update({
      where: { id: params.id },
      data: {
        symptoms: symptoms ?? undefined,
        duration: duration ?? undefined,
        notes: notes ?? undefined,
        vitalSigns: vitalSigns ?? undefined,
      },
    });

    return NextResponse.json(consultation);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
