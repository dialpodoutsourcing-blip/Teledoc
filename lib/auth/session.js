import prisma from '@/lib/prisma';
import { getSupabaseServerClient } from '@/lib/supabase/server';

function normalizeRole(role) {
  if (role === 'DOCTOR' || role === 'PATIENT') {
    return role;
  }

  return 'PATIENT';
}

function getFallbackFirstName(authUser) {
  const emailPrefix = authUser.email?.split('@')[0] || 'User';
  return emailPrefix.slice(0, 1).toUpperCase() + emailPrefix.slice(1);
}

function getMetadataForBootstrap(authUser) {
  const metadata = authUser.user_metadata || {};
  const role = normalizeRole(String(metadata.role || '').toUpperCase());

  return {
    role,
    firstName: metadata.firstName || getFallbackFirstName(authUser),
    lastName: metadata.lastName || 'User',
    specialization: metadata.specialization || null,
    licenseNumber: metadata.licenseNumber || null,
    dateOfBirth: metadata.dateOfBirth ? new Date(metadata.dateOfBirth) : null,
    gender: metadata.gender || null,
    phone: metadata.phone || null,
  };
}

export async function ensureAppUserForAuthUser(authUser) {
  if (!authUser?.id || !authUser?.email) {
    return null;
  }

  const bootstrap = getMetadataForBootstrap(authUser);
  const existingUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      patientProfile: true,
      doctorProfile: true,
    },
  });

  if (existingUser) {
    if (existingUser.email !== authUser.email) {
      return prisma.user.update({
        where: { id: authUser.id },
        data: { email: authUser.email },
        include: {
          patientProfile: true,
          doctorProfile: true,
        },
      });
    }

    return existingUser;
  }

  return prisma.user.create({
    data: {
      id: authUser.id,
      email: authUser.email,
      role: bootstrap.role,
      ...(bootstrap.role === 'DOCTOR'
        ? {
            doctorProfile: {
              create: {
                firstName: bootstrap.firstName,
                lastName: bootstrap.lastName,
                specialization: bootstrap.specialization,
                licenseNumber: bootstrap.licenseNumber,
                phone: bootstrap.phone,
              },
            },
          }
        : {
            patientProfile: {
              create: {
                firstName: bootstrap.firstName,
                lastName: bootstrap.lastName,
                dateOfBirth: bootstrap.dateOfBirth,
                gender: bootstrap.gender,
                phone: bootstrap.phone,
              },
            },
          }),
    },
    include: {
      patientProfile: true,
      doctorProfile: true,
    },
  });
}

export async function getCurrentAuthUser() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user || null;
}

export async function getCurrentAppUser() {
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    return null;
  }

  return ensureAppUserForAuthUser(authUser);
}
