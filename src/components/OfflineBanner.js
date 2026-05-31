'use client';

import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [native, setNative] = useState(false);

  useEffect(() => {
    let removeListener;

    async function init() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        setNative(true);

        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        setOffline(!status.connected);

        const handle = await Network.addListener('networkStatusChange', ({ connected }) => {
          setOffline(!connected);
        });
        removeListener = () => handle.remove();
      } catch {
        // Web — rely on browser online events below
      }

      const onOnline = () => setOffline(false);
      const onOffline = () => setOffline(true);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      if (!navigator.onLine) setOffline(true);

      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }

    let cleanupBrowser;
    init().then((cleanup) => {
      cleanupBrowser = cleanup;
    });

    return () => {
      removeListener?.();
      cleanupBrowser?.();
    };
  }, []);

  if (!offline) return null;

  return (
    <div className={`offline-banner${native ? ' offline-banner--native' : ''}`} role="status">
      You&apos;re offline. Data will refresh when you&apos;re back online.
    </div>
  );
}
