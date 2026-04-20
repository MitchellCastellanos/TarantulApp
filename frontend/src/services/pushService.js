import { Capacitor } from '@capacitor/core'
import api from './api'

let listenersBound = false

export async function initNativePush() {
  if (!Capacitor.isNativePlatform()) return
  if (listenersBound) return

  const { PushNotifications } = await import('@capacitor/push-notifications')
  listenersBound = true

  PushNotifications.addListener('registration', async (token) => {
    try {
      await api.post('/push/device-token', {
        token: token?.value || '',
        platform: Capacitor.getPlatform(),
      })
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[TarantulApp] push token register failed', err?.response?.status || err?.message)
      }
    }
  })

  PushNotifications.addListener('registrationError', (error) => {
    if (import.meta.env.DEV) {
      console.warn('[TarantulApp] push registration error', error)
    }
  })

  const perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') return
  await PushNotifications.register()
}
