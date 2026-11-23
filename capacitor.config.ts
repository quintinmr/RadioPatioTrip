import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.radiopatio.trip',
  appName: 'RadioPatio Trip',
  webDir: 'dist',
  android: { allowMixedContent: false },
}

export default config
