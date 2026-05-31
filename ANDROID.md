# FinanceCalc Android App

The Android app bundles the full UI inside the APK (offline-capable shell). Your data and auth API stay on the deployed backend (`NEXT_PUBLIC_API_URL` in `.env.mobile`).

## Build the APK

1. Install [Android Studio](https://developer.android.com/studio) (includes JDK).
2. From the project folder:

```bash
npm install
npm run android          # export web UI + sync into android/
npm run open:android     # open in Android Studio
```

3. In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**  
   Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Play Store release

1. **Build → Generate Signed Bundle / APK** (AAB recommended).
2. Create an app in [Google Play Console](https://play.google.com/console).
3. Upload the AAB, complete store listing, privacy policy, and content rating.

## Backend (required for sign-in on the app)

Deploy the latest web app to Vercel so API routes include CORS (`src/middleware.js`) and cross-origin session cookies (`src/lib/auth.js`).

After changing `.env.mobile` API URL:

```bash
npm run android
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run build:mobile` | Static export to `out/` |
| `npm run sync:android` | Copy `out/` into Android project |
| `npm run android` | Both of the above |
| `npm run open:android` | Open Android Studio |
