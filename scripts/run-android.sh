#!/usr/bin/env sh
set -e

# React Native CLI needs adb on PATH. Default to the standard macOS SDK location.
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_HOME
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"

if ! command -v adb >/dev/null 2>&1; then
  echo "error: adb not found. Set ANDROID_HOME or install Android SDK platform-tools." >&2
  echo "  Expected: $ANDROID_HOME/platform-tools/adb" >&2
  exit 1
fi

exec npx react-native run-android "$@"
