'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function HomeRedirect() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard/');
    } else if (status === 'unauthenticated') {
      router.replace('/auth/signin/');
    }
  }, [status, router]);

  return (
    <div className="loading-spinner" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );
}
