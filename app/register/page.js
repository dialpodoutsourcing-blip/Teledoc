import { redirectIfAuthenticated } from '@/lib/auth/guards';
import RegisterPage from '@/components/pages/RegisterPage';

export default async function RegisterRoute() {
  await redirectIfAuthenticated();
  return <RegisterPage />;
}
