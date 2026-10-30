import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { ref } from 'vue'
import type { Router } from 'vue-router'
import { getAccessToken } from '../api/tokens'
import { setFRB } from '../api/main'
import { useNotifyStore } from '../stores/notifications'
import { getNotificationPath } from './useFirebaseMessaging'
import { escapeHtml } from '../utils/notification'
import { normalizePushPayload } from '../utils/pushPayload'
import { isNativeApp } from '../utils/native'

export const nativePushPermission = ref<string>('prompt')
export const nativePushError = ref('')
let enqueueSync: ((request?: boolean) => Promise<boolean>) | undefined

export async function requestNativeNotificationPermission() {
  return enqueueSync?.(true) ?? false
}

/** One app-owned lifecycle. Serializes token deletion/creation across account changes. */
export function setupNativeMessaging(router: Router): () => void {
  if (!isNativeApp()) return () => undefined
  let disposed = false
  let session = getAccessToken()
  let generation = 0
  let registered = ''
  let automaticPermissionAttempted = false
  let cleanupPending = false
  let controller: AbortController | undefined
  let queue: Promise<unknown> = Promise.resolve()
  const handles: PluginListenerHandle[] = []
  const notify = useNotifyStore()
  const keepHandle = async (promise: Promise<PluginListenerHandle>) => {
    const handle = await promise
    if (disposed) await handle.remove()
    else handles.push(handle)
  }
  const initialize = async () => {
    await keepHandle(FirebaseMessaging.addListener('tokenReceived', () => { void sync() }))
    await keepHandle(FirebaseMessaging.addListener('notificationReceived', ({ notification }) => {
      if (disposed || !getAccessToken() || document.visibilityState !== 'visible') return
      notify.add(`${escapeHtml(notification.title ?? 'Новое сообщение')}<br>${escapeHtml(normalizePushPayload(notification).message)}`, 'positive')
    }))
    await keepHandle(FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
      if (disposed) return
      const path = getNotificationPath(notification)
      // The router's auth guard preserves this destination until login completes.
      if (path) void router.push(path).catch(() => undefined)
    }))
    if (Capacitor.getPlatform() === 'android') {
      await FirebaseMessaging.createChannel({ id: 'messages', name: 'Сообщения', importance: 4 })
    }
  }
  const ready = initialize()
  // Handle startup failures even when no user is signed in.
  void ready.catch(() => { nativePushError.value = 'Не удалось настроить уведомления.' })
  const sync = (request = false, automatic = false): Promise<boolean> => {
    const currentGeneration = generation
    const account = getAccessToken()
    const operation = queue.then(async () => {
      await ready
      if (disposed || currentGeneration !== generation || account !== getAccessToken()) return false
      if (cleanupPending) {
        await FirebaseMessaging.deleteToken()
        await FirebaseMessaging.removeAllDeliveredNotifications()
        cleanupPending = false
      }
      if (!account) return false
      let permission = await FirebaseMessaging.checkPermissions()
      if (disposed || currentGeneration !== generation || account !== getAccessToken()) return false
      const canRequest = permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale'
      // Only startup/login may prompt automatically, once per app lifecycle (never on resume).
      if (canRequest && (request || (automatic && !automaticPermissionAttempted))) {
        automaticPermissionAttempted = true
        permission = await FirebaseMessaging.requestPermissions()
      }
      if (disposed || currentGeneration !== generation || account !== getAccessToken()) return false
      nativePushPermission.value = permission.receive
      if (permission.receive !== 'granted') return false
      const { token } = await FirebaseMessaging.getToken()
      if (disposed || currentGeneration !== generation || account !== getAccessToken()) return false
      if (registered !== token) {
        controller = new AbortController()
        // Explicit credentials prevent a late token request from binding to the next account.
        await setFRB(token, { signal: controller.signal, headers: { Authorization: `Bearer ${account}` } })
        if (currentGeneration !== generation || disposed) return false
        registered = token
      }
      nativePushError.value = ''
      return true
    }).catch(() => {
      if (!disposed && currentGeneration === generation) nativePushError.value = 'Не удалось включить уведомления. Попробуйте ещё раз.'
      return false
    })
    queue = operation
    return operation
  }
  enqueueSync = sync
  const onAuth = () => {
    const next = getAccessToken()
    if (next === session) return
    const previous = session
    session = next
    generation++
    controller?.abort()
    registered = ''
    if (previous) cleanupPending = true
    void sync(false, true)
  }
  const onResume = () => {
    onAuth()
    if (document.visibilityState === 'visible') void sync()
  }
  window.addEventListener('auth-token-changed', onAuth)
  window.addEventListener('storage', onAuth)
  window.addEventListener('online', onResume)
  document.addEventListener('visibilitychange', onResume)
  void sync(false, true)
  return () => {
    disposed = true
    generation++
    controller?.abort()
    enqueueSync = undefined
    window.removeEventListener('auth-token-changed', onAuth)
    window.removeEventListener('storage', onAuth)
    window.removeEventListener('online', onResume)
    document.removeEventListener('visibilitychange', onResume)
    for (const handle of handles) void handle.remove()
  }
}
