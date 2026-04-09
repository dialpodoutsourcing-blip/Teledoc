const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Doctor ────────────────────────────────────────────────────────────────
  const doctorPassword = await bcrypt.hash('demo123', 12);

  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@demo.com' },
    update: {},
    create: {
      email: 'doctor@demo.com',
      password: doctorPassword,
      role: 'DOCTOR',
      doctorProfile: {
        create: {
          firstName: 'Sarah',
          lastName: 'Mitchell',
          specialization: 'Internal Medicine',
          licenseNumber: 'MD-2024-10482',
          phone: '+1 (555) 201-7830',
          bio: 'Board-certified internist with 12 years of clinical experience. Specializes in chronic disease management, preventive care, and telemedicine consultations. Fellow of the American College of Physicians.',
          isOnline: true,
        },
      },
    },
    include: { doctorProfile: true },
  });

  console.log(`✅ Doctor seeded:`);
  console.log(`   Name       : Dr. Sarah Mitchell`);
  console.log(`   Email      : doctor@demo.com`);
  console.log(`   Password   : demo123`);
  console.log(`   Speciality : Internal Medicine`);
  console.log(`   Status     : Online\n`);

  // ── Patient ───────────────────────────────────────────────────────────────
  const patientPassword = await bcrypt.hash('demo123', 12);

  const patient = await prisma.user.upsert({
    where: { email: 'patient@demo.com' },
    update: {},
    create: {
      email: 'patient@demo.com',
      password: patientPassword,
      role: 'PATIENT',
      patientProfile: {
        create: {
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
            'Type 2 Diabetes Mellitus — diagnosed 2018, managed with oral hypoglycemics. ' +
            'Hypertension — diagnosed 2020, blood pressure controlled on ACE inhibitor. ' +
            'Appendectomy — 2005 (uncomplicated). ' +
            'Family history of cardiovascular disease (father had MI at age 58). ' +
            'Non-smoker. Occasional alcohol use. Sedentary occupation (desk work).',
        },
      },
    },
    include: { patientProfile: true },
  });

  console.log(`✅ Patient seeded:`);
  console.log(`   Name         : James Reeves`);
  console.log(`   Email        : patient@demo.com`);
  console.log(`   Password     : demo123`);
  console.log(`   DOB          : March 15, 1988 (Age 37)`);
  console.log(`   Blood Type   : O+`);
  console.log(`   Conditions   : Type 2 Diabetes, Hypertension`);
  console.log(`   Allergies    : Penicillin, Sulfonamides, Latex\n`);

  // ── Sample completed consultation ─────────────────────────────────────────
  const existingConsult = await prisma.consultation.findFirst({
    where: {
      patientId: patient.patientProfile.id,
      doctorId: doctor.doctorProfile.id,
      status: 'COMPLETED',
    },
  });

  if (!existingConsult) {
    const pastAppt = await prisma.appointment.create({
      data: {
        patientId: patient.patientProfile.id,
        doctorId: doctor.doctorProfile.id,
        scheduledAt: new Date('2026-03-28T10:00:00Z'),
        status: 'COMPLETED',
        type: 'SCHEDULED',
        reason: 'Routine diabetes follow-up and blood pressure check',
      },
    });

    const consultation = await prisma.consultation.create({
      data: {
        appointmentId: pastAppt.id,
        patientId: patient.patientProfile.id,
        doctorId: doctor.doctorProfile.id,
        roomId: 'demo-room-past-001',
        startedAt: new Date('2026-03-28T10:05:00Z'),
        endedAt: new Date('2026-03-28T10:32:00Z'),
        symptoms: 'Fatigue, mild headache, occasional dizziness in the mornings. Blood sugar readings ranging 180-240 mg/dL over the past 2 weeks.',
        duration: '27 min',
        vitalSigns: 'BP: 138/88 mmHg, HR: 76 bpm, Temp: 98.4°F, SpO2: 98%',
        notes: 'Patient reports dietary non-compliance over the holidays. Increased stress at work. Sleep approximately 5-6 hours/night. Mild peripheral tingling noted in both feet. No chest pain or shortness of breath.',
        diagnosis: 'Poorly controlled Type 2 Diabetes Mellitus with early signs of peripheral neuropathy. Hypertension — borderline control.',
        recommendations: 'Increase Metformin dose to 1000mg twice daily. Dietary counseling referral. HbA1c and comprehensive metabolic panel in 4 weeks. Improve sleep hygiene. 30 min daily walking recommended. Monitor BP twice daily.',
        prescription: 'Metformin 1000mg — twice daily with meals. Continue Lisinopril 10mg once daily. Add Gabapentin 100mg at bedtime for neuropathic symptoms (trial for 4 weeks).',
        followUpDate: new Date('2026-04-28T10:00:00Z'),
        status: 'COMPLETED',
      },
    });

    await prisma.medicalRecord.create({
      data: {
        patientId: patient.patientProfile.id,
        consultationId: consultation.id,
        title: 'Consultation — March 28, 2026',
        summary:
          'Diagnosis: Poorly controlled T2DM with early peripheral neuropathy. ' +
          'Recommendations: Metformin dose increase, dietary counseling, HbA1c in 4 weeks. ' +
          'Prescription: Metformin 1000mg BD, Gabapentin 100mg QHS.',
      },
    });

    console.log(`✅ Sample consultation history seeded (March 28, 2026)\n`);
  } else {
    console.log(`ℹ️  Sample consultation already exists — skipping.\n`);
  }

  console.log('─────────────────────────────────────────────');
  console.log('🎉 Seed complete! Login at http://localhost:5173');
  console.log('─────────────────────────────────────────────');
  console.log('  Doctor  → doctor@demo.com  / demo123');
  console.log('  Patient → patient@demo.com / demo123');
  console.log('─────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
