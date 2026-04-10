import { redirectIfAuthenticated } from '@/lib/auth/guards';
import LoginPage from '@/components/pages/LoginPage';

export default async function LoginRoute() {
  await redirectIfAuthenticated();
  return <LoginPage />;
}
