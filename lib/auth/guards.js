import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/auth/session';

export async function redirectIfAuthenticated() {
  const user = await getCurrentAppUser();

  if (!user) {
    return null;
  }

  redirect(user.role === 'DOCTOR' ? '/doctor' : '/patient');
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

export async function requireRole(requiredRole) {
  const user = await requireAuthenticatedUser();

  if (user.role !== requiredRole) {
    redirect(user.role === 'DOCTOR' ? '/doctor' : '/patient');
  }

  return user;
}
