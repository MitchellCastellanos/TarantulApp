import { Capacitor } from '@capacitor/core'
import api from './api'

let listenersBound = false
let ackListenersBound = false

function extractPushDeliveryId(data) {
  if (!data || typeof data !== 'object') return null
  const raw = data.pushDeliveryId ?? data.pushdeliveryid ?? data.push_delivery_id
  if (raw == null) return null
  const s = String(raw).trim()
  return s.length ? s : null
}

async function acknowledgePushDelivery(id) {
  try {
    await api.post('/push/delivery-ack', { pushDeliveryId: id })
  } catch {
    /* offline / anon — best-effort only */
  }
}

function attachDealPushAckHandlers(PushNotifications) {
  if (ackListenersBound) return
  ackListenersBound = true

  PushNotifications.addListener('pushNotificationReceived', (event) => {
    const nested = event?.notification?.data
    const flat = typeof nested === 'object' && nested != null ? nested : {}
    const id = extractPushDeliveryId(flat) || extractPushDeliveryId(event?.data)
    if (id) void acknowledgePushDelivery(id)
  })

  PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
    const nested = event?.notification?.data
    const flat = typeof nested === 'object' && nested != null ? nested : {}
    const id = extractPushDeliveryId(flat) || extractPushDeliveryId(event?.data)
    if (id) void acknowledgePushDelivery(id)
  })
}

export async function initNativePush() {
  if (!Capacitor.isNativePlatform()) return
  if (listenersBound) return

  const { PushNotifications } = await import('@capacitor/push-notifications')
  listenersBound = true
  attachDealPushAckHandlers(PushNotifications)

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
