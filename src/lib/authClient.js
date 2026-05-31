import { signOut as nextAuthSignOut } from 'next-auth/react';
import { clearAllCache } from '@/lib/fetchCache';

/** Sign out and wipe all cached API data for this browser. */
export async function signOutAndClearCache(options) {
  clearAllCache();
  await nextAuthSignOut(options);
}
