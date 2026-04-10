const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

loadEnvFile();

const prisma = new PrismaClient();

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getSupabaseAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to seed demo auth users.'
    );
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function upsertAuthUser(supabase, { email, password, metadata }) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listError) {
    throw listError;
  }

  const existing = listed.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );

  if (!existing) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error) {
      throw error;
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error) {
    throw error;
  }

  return data.user;
}

async function reconcileLocalUser(authUser, role) {
  const existingById = await prisma.user.findUnique({
    where: { id: authUser.id },
  });

  if (existingById) {
    await prisma.user.update({
      where: { id: authUser.id },
      data: {
        email: authUser.email,
        role,
      },
    });
    return;
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email: authUser.email },
    include: {
      doctorProfile: true,
      patientProfile: true,
    },
  });

  if (!existingByEmail) {
    await prisma.user.create({
      data: {
        id: authUser.id,
        email: authUser.email,
        role,
      },
    });
    return;
  }

  const legacyEmail = `${role.toLowerCase()}.legacy.${Date.now()}@local.invalid`;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existingByEmail.id },
      data: { email: legacyEmail },
    });

    await tx.user.upsert({
      where: { id: authUser.id },
      update: {
        email: authUser.email,
        role,
      },
      create: {
        id: authUser.id,
        email: authUser.email,
        role,
      },
    });

    if (existingByEmail.doctorProfile) {
      await tx.doctorProfile.update({
        where: { userId: existingByEmail.id },
        data: { userId: authUser.id },
      });
    }

    if (existingByEmail.patientProfile) {
      await tx.patientProfile.update({
        where: { userId: existingByEmail.id },
        data: { userId: authUser.id },
      });
    }

    await tx.user.delete({
      where: { id: existingByEmail.id },
    });
  });
}

async function main() {
  const supabase = getSupabaseAdminClient();

  console.log('Seeding demo users and sample data...\n');

  const doctorAuthUser = await upsertAuthUser(supabase, {
    email: 'doctor@demo.com',
    password: 'demo123',
    metadata: {
      role: 'DOCTOR',
      firstName: 'Sarah',
      lastName: 'Mitchell',
      specialization: 'Internal Medicine',
      licenseNumber: 'MD-2024-10482',
      phone: '+1 (555) 201-7830',
    },
  });

  const patientAuthUser = await upsertAuthUser(supabase, {
    email: 'patient@demo.com',
    password: 'demo123',
    metadata: {
      role: 'PATIENT',
      firstName: 'James',
      lastName: 'Reeves',
      dateOfBirth: '1988-03-15',
      gender: 'Male',
      phone: '+1 (555) 987-3412',
    },
  });

  await reconcileLocalUser(doctorAuthUser, 'DOCTOR');

  await prisma.patientProfile.deleteMany({
    where: { userId: doctorAuthUser.id },
  });

  const doctorProfile = await prisma.doctorProfile.upsert({
    where: { userId: doctorAuthUser.id },
    update: {
      firstName: 'Sarah',
      lastName: 'Mitchell',
      specialization: 'Internal Medicine',
      licenseNumber: 'MD-2024-10482',
      phone: '+1 (555) 201-7830',
      bio: 'Board-certified internist with 12 years of clinical experience. Specializes in chronic disease management, preventive care, and telemedicine consultations.',
      isOnline: true,
    },
    create: {
      userId: doctorAuthUser.id,
      firstName: 'Sarah',
      lastName: 'Mitchell',
      specialization: 'Internal Medicine',
      licenseNumber: 'MD-2024-10482',
      phone: '+1 (555) 201-7830',
      bio: 'Board-certified internist with 12 years of clinical experience. Specializes in chronic disease management, preventive care, and telemedicine consultations.',
      isOnline: true,
    },
  });

  await reconcileLocalUser(patientAuthUser, 'PATIENT');

  await prisma.doctorProfile.deleteMany({
    where: { userId: patientAuthUser.id },
  });

  const patientProfile = await prisma.patientProfile.upsert({
    where: { userId: patientAuthUser.id },
    update: {
      firstName: 'James',
      lastName: 'Reeves',
      dateOfBirth: new Date('1988-03-15'),
      gender: 'Male',
      phone: '+1 (555) 987-3412',
      address: '247 Maple Creek Drive, Austin, TX 78701',
      bloodType: 'O+',
      allergies: 'Penicillin, Sulfonamides, Latex',
      medications: 'Metformin 500mg (twice daily), Lisinopril 10mg (once daily), Aspirin 81mg (once daily)',
      medicalHistory:
        'Type 2 Diabetes Mellitus diagnosed in 2018. Hypertension diagnosed in 2020. Appendectomy in 2005. Family history of cardiovascular disease.',
    },
    create: {
      userId: patientAuthUser.id,
      firstName: 'James',
      lastName: 'Reeves',
      dateOfBirth: new Date('1988-03-15'),
      gender: 'Male',
      phone: '+1 (555) 987-3412',
      address: '247 Maple Creek Drive, Austin, TX 78701',
      bloodType: 'O+',
      allergies: 'Penicillin, Sulfonamides, Latex',
      medications: 'Metformin 500mg (twice daily), Lisinopril 10mg (once daily), Aspirin 81mg (once daily)',
      medicalHistory:
        'Type 2 Diabetes Mellitus diagnosed in 2018. Hypertension diagnosed in 2020. Appendectomy in 2005. Family history of cardiovascular disease.',
    },
  });

  const existingConsultation = await prisma.consultation.findFirst({
    where: {
      patientId: patientProfile.id,
      doctorId: doctorProfile.id,
      status: 'COMPLETED',
    },
  });

  if (!existingConsultation) {
    const pastAppointment = await prisma.appointment.create({
      data: {
        patientId: patientProfile.id,
        doctorId: doctorProfile.id,
        scheduledAt: new Date('2026-03-28T10:00:00Z'),
        status: 'COMPLETED',
        type: 'SCHEDULED',
        reason: 'Routine diabetes follow-up and blood pressure check',
      },
    });

    const consultation = await prisma.consultation.create({
      data: {
        appointmentId: pastAppointment.id,
        patientId: patientProfile.id,
        doctorId: doctorProfile.id,
        roomId: 'demo-room-past-001',
        startedAt: new Date('2026-03-28T10:05:00Z'),
        endedAt: new Date('2026-03-28T10:32:00Z'),
        symptoms: 'Fatigue, mild headache, occasional dizziness in the mornings. Blood sugar readings ranging 180-240 mg/dL over the past 2 weeks.',
        duration: '27 min',
        vitalSigns: 'BP: 138/88 mmHg, HR: 76 bpm, Temp: 98.4F, SpO2: 98%',
        notes: 'Patient reports dietary non-compliance over the holidays and increased stress at work.',
        diagnosis: 'Poorly controlled Type 2 Diabetes Mellitus with early signs of peripheral neuropathy. Hypertension with borderline control.',
        recommendations: 'Increase Metformin dose to 1000mg twice daily. Schedule HbA1c and comprehensive metabolic panel in 4 weeks.',
        prescription: 'Metformin 1000mg twice daily with meals. Continue Lisinopril 10mg once daily.',
        followUpDate: new Date('2026-04-28T10:00:00Z'),
        status: 'COMPLETED',
      },
    });

    await prisma.medicalRecord.create({
      data: {
        patientId: patientProfile.id,
        consultationId: consultation.id,
        title: 'Consultation - March 28, 2026',
        summary:
          'Diagnosis: Poorly controlled T2DM with early peripheral neuropathy. Recommendations: Metformin dose increase and follow-up lab work.',
      },
    });
  }

  console.log('Demo seed complete.');
  console.log('Doctor: doctor@demo.com / demo123');
  console.log('Patient: patient@demo.com / demo123');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
