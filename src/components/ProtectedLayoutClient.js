'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { QuickTransactionFab } from '@/components/QuickTransactionModal';
import { LanguageProvider } from '@/components/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

export default function ProtectedLayoutClient({ children }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  return (
    <LanguageProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <LanguageToggle />
          {children}
        </main>
        <BottomNav />
        <QuickTransactionFab />
      </div>
    </LanguageProvider>
  );
}

