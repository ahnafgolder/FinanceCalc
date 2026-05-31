'use client';
import { SessionProvider } from 'next-auth/react';
import { getAuthBasePath } from '@/lib/api';

export default function AuthProvider({ children }) {
  return (
    <SessionProvider basePath={getAuthBasePath()}>
      {children}
    </SessionProvider>
  );
}
