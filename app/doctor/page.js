import { requireRole } from '@/lib/auth/guards';
import DoctorDashboard from '@/components/pages/DoctorDashboard';

export default async function DoctorRoute() {
  await requireRole('DOCTOR');
  return <DoctorDashboard />;
}
