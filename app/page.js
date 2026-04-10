import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/auth/session';

export default async function HomePage() {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect('/login');
  }

  redirect(user.role === 'DOCTOR' ? '/doctor' : '/patient');
}
