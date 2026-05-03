import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tarantulapp.app',
  appName: 'TarantulApp\u2122',
  webDir: 'dist',
  server: {
    // 'http' evita bloqueo de “mixed content” al API local (http://10.0.2.2:8080) desde el WebView.
    // Con 'https' el origen es https://localhost y el navegador bloquea XHR a http → Discover vacío, login roto, etc.
    // Builds contra https://api.tarantulapp.com siguen funcionando (HTTP → HTTPS está permitido).
    androidScheme: 'http',
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
