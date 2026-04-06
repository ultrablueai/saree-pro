import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import LoginPage from './page';

export default async function LoginPageWrapper() {
  const session = await getSessionUser();
  
  if (session) {
    redirect('/workspace');
  }
  
  return <LoginPage />;
}
