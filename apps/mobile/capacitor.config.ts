import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.nomin.trey',
  appName: 'Trey',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#0A0D14',
    allowMixedContent: true
  }
}

export default config
