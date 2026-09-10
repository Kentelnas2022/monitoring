import { cookies } from 'next/headers';
import DashboardClient from '@/components/DashboardClient';

export default async function Page() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('monitoring_auth_session')?.value;
  const userCookie = cookieStore.get('monitoring_auth_user')?.value;

  const isAuthenticated = sessionCookie === 'true';
  let currentUser = null;

  if (userCookie) {
    try {
      currentUser = JSON.parse(decodeURIComponent(userCookie));
    } catch {}
  }

  return (
    <DashboardClient
      initialAuthenticated={isAuthenticated}
      initialUser={currentUser}
    />
  );
}
