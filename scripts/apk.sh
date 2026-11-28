#!/usr/bin/env bash
# APK de release firmado con la clave fija (~/.config/radiopatio/keystore.env).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source "$HOME/.config/radiopatio/keystore.env"; set +a
npm run build && npx cap sync android
VC=$(git rev-list --count HEAD); VN=$(node -p "require('./package.json').version")
( cd android && ./gradlew assembleRelease --no-daemon -PversionCode="$VC" -PversionName="$VN" )
cp android/app/build/outputs/apk/release/app-release.apk RadioPatioTrip.apk
echo "APK firmado: $(pwd)/RadioPatioTrip.apk (versionCode $VC)"
