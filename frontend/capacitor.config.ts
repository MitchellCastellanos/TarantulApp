import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tarantulapp.app',
  appName: 'TarantulApp',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Uncomment the next line to load from the live Vercel URL instead of bundled assets:
    // url: 'https://tarantulapp.vercel.app',
    // cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
