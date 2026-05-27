import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AuthProvider from '@/components/AuthProvider';
import Sidebar from '@/components/Sidebar';
import { LanguageProvider } from '@/components/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');

  return (
    <AuthProvider>
      <LanguageProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <LanguageToggle />
            {children}
          </main>
        </div>
      </LanguageProvider>
    </AuthProvider>
  );
}
