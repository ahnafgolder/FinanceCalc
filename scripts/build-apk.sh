#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building mobile web bundle..."
npm run android

# Find a JDK (Temurin, Android Studio bundled JBR, or JAVA_HOME)
if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ -d "/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home" ]]; then
    export JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home"
  elif [[ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  fi
fi

if [[ -z "${JAVA_HOME:-}" || ! -x "$JAVA_HOME/bin/java" ]]; then
  echo ""
  echo "ERROR: Java not found."
  echo "Install Android Studio: https://developer.android.com/studio"
  echo "Or install JDK 21: brew install --cask temurin@21"
  exit 1
fi

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "==> Using Java: $($JAVA_HOME/bin/java -version 2>&1 | head -1)"
echo "==> Building debug APK..."
cd android
./gradlew assembleDebug

APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "Done! APK ready at:"
echo "  $APK"
echo ""
echo "Install on a connected phone:"
echo "  adb install -r \"$APK\""
