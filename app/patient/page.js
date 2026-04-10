import { requireRole } from '@/lib/auth/guards';
import PatientDashboard from '@/components/pages/PatientDashboard';

export default async function PatientRoute() {
  await requireRole('PATIENT');
  return <PatientDashboard />;
}
