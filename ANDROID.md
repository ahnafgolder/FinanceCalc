# FinanceCalc Android App

The Android app is a **native shell** (Capacitor) with the **full UI bundled inside the APK** — it does not open your site in Chrome or feel like “visiting a URL.” Screens, bottom navigation, splash screen, status bar, back button, and haptics all run locally on the device.

Your **data and sign-in** still talk to the deployed backend (`NEXT_PUBLIC_API_URL` in `.env.mobile`), so bills and payments stay in sync across web and mobile.

## Architecture

| Layer | What it does |
|-------|----------------|
| **APK (`out/` → `android/`)** | Static Next.js export: dashboard, bills, payments, settings UI |
| **Capacitor** | WebView tuned for app feel (no overscroll, dark chrome, keyboard resize) |
| **Vercel API** | Auth, MongoDB, CRUD — same as the web app |

## Prerequisites

1. [Node.js](https://nodejs.org/) 18+
2. [Android Studio](https://developer.android.com/studio) (includes JDK and Android SDK)

## Build & install (debug APK)

From the project folder:

```bash
npm install
npm run build:apk
```

This exports the UI, syncs into `android/`, and builds:

`android/app/build/outputs/apk/debug/app-debug.apk`

Install on a phone with USB debugging:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Open in Android Studio

```bash
npm run android          # export + cap sync
npm run open:android     # opens Android Studio
```

Then **Run** on a device/emulator, or **Build → Build APK(s)**.

## Play Store release

1. **Build → Generate Signed Bundle / APK** (AAB recommended).
2. Bump `versionCode` / `versionName` in `android/app/build.gradle`.
3. Create the app in [Google Play Console](https://play.google.com/console).
4. Upload the AAB, store listing, privacy policy, content rating.

## Backend (required for sign-in)

Deploy the latest web app so API routes include CORS (`src/middleware.js`) and cross-origin session cookies (`src/lib/auth.js`).

Set your API URL in `.env.mobile`:

```env
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
NEXTAUTH_URL=https://your-app.vercel.app
```

After changing it:

```bash
npm run android
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run build:mobile` | Static export to `out/` (stashes API routes during build) |
| `npm run sync:android` | Copy `out/` into the Android project |
| `npm run android` | Both of the above |
| `npm run open:android` | Open Android Studio |
| `npm run build:apk` | Full pipeline → debug APK |

## Native app features

- Bottom tab navigation (always on device, not desktop sidebar)
- Splash screen + dark status bar
- Android back button (history, then exit)
- Light haptic feedback on tab taps
- Offline banner when network is unavailable
- Keyboard-aware forms (body resize)
- No WebView overscroll “rubber band”
