'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  getLastCacheScope,
  setCacheScope,
  setLastCacheScope,
} from '@/lib/cacheScope';
import { clearAllCache } from '@/lib/fetchCache';

/** Bind API cache to the logged-in user; clear when the account changes. */
export default function CacheScopeSync() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id || session?.user?.email || '';
  const prevUser = useRef('');

  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;

    const lastScope = getLastCacheScope();
    if (lastScope && lastScope !== userId) {
      clearAllCache();
    } else if (prevUser.current && prevUser.current !== userId) {
      clearAllCache();
    }

    setCacheScope(userId);
    setLastCacheScope(userId);
    prevUser.current = userId;
  }, [userId, status]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      clearAllCache();
      setCacheScope('');
      setLastCacheScope('');
      prevUser.current = '';
    }
  }, [status]);

  return null;
}
