import { requireAuthenticatedUser } from '@/lib/auth/guards';
import ConsultationPage from '@/components/pages/ConsultationPage';

export default async function ConsultationRoute() {
  await requireAuthenticatedUser();
  return <ConsultationPage />;
}
