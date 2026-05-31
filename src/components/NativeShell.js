'use client';

import { useEffect } from 'react';

export default function NativeShell() {
  useEffect(() => {
    async function initNative() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { StatusBar, Style } = await import('@capacitor/status-bar');
        const { SplashScreen } = await import('@capacitor/splash-screen');
        const { App } = await import('@capacitor/app');

        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0a0e1a' });
        await SplashScreen.hide();

        App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
      } catch {
        // Web build — Capacitor plugins not loaded
      }
    }

    initNative();
  }, []);

  return null;
}
