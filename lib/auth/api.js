import { NextResponse } from 'next/server';
import { getCurrentAppUser } from '@/lib/auth/session';

export async function requireApiUser(requiredRole) {
  const user = await getCurrentAppUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (requiredRole && user.role !== requiredRole) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { user };
}
