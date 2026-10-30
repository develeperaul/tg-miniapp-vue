import { App } from '@capacitor/app'
import type { Photo } from '@capacitor/camera'
import { shallowRef } from 'vue'
import { isNativeApp } from '../utils/native'

export type CaptureContext = { route: string; slot: string; account: string }
type PendingCapture = CaptureContext & {
  id: string
  startedAt: number
  status: 'pending' | 'ready' | 'error'
  photo?: Photo
}
const STORAGE_KEY = 'native-camera-pending-v1'
const MAX_AGE = 30 * 60 * 1000

// Only capture metadata and the local URI are retained; no form values or tokens.
function readPending(): PendingCapture | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (value && typeof value.id === 'string' && typeof value.route === 'string' &&
        typeof value.slot === 'string' && typeof value.account === 'string' &&
        typeof value.startedAt === 'number' && Date.now() >= value.startedAt &&
        Date.now() - value.startedAt < MAX_AGE &&
        ['pending', 'ready', 'error'].includes(value.status)) return value
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* Unavailable or invalid storage cannot safely recover a capture. */ }
  return null
}
export const pendingCameraCapture = shallowRef<PendingCapture | null>(readPending())
// Only an operation retained from a previous process can receive a restored event.
const restoredCaptureId = pendingCameraCapture.value?.id

function save(value: PendingCapture | null) {
  // Persist before publishing state, so a failed write never launches the camera.
  if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  else localStorage.removeItem(STORAGE_KEY)
  pendingCameraCapture.value = value
}
export function matchesCapture(context: CaptureContext): boolean {
  const pending = pendingCameraCapture.value
  return !!pending && Date.now() - pending.startedAt < MAX_AGE &&
    pending.route === context.route && pending.slot === context.slot &&
    pending.account === context.account
}
export function beginCapture(context: CaptureContext): string {
  if (!context.account || !context.slot) throw new Error('Дождитесь загрузки профиля.')
  if (pendingCameraCapture.value && Date.now() - pendingCameraCapture.value.startedAt < MAX_AGE) {
    throw new Error('Сначала используйте или удалите предыдущий снимок на исходной странице.')
  }
  const id = crypto.randomUUID()
  save({ ...context, id, startedAt: Date.now(), status: 'pending' })
  return id
}
let claimedCaptureId: string | undefined
export function releaseRecoveredPhoto(id: string) {
  if (claimedCaptureId === id) claimedCaptureId = undefined
}
export function discardCapture(id: string) {
  releaseRecoveredPhoto(id)
  if (pendingCameraCapture.value?.id === id) save(null)
}
// FileTile keeps the URI until conversion and live-context validation succeed.
export function retainCapturePhoto(id: string, photo: Photo) {
  const pending = pendingCameraCapture.value
  if (pending?.id === id) save({ ...pending, status: 'ready', photo })
}
export function claimRecoveredPhoto(context: CaptureContext, consume = true): Photo | null {
  const pending = pendingCameraCapture.value
  if (!matchesCapture(context) || pending?.status !== 'ready' || claimedCaptureId === pending.id) return null
  const photo = pending.photo || null
  if (consume) discardCapture(pending.id)
  else if (photo) claimedCaptureId = pending.id
  return photo
}

let listener: Promise<import('@capacitor/core').PluginListenerHandle> | undefined
export function setupCameraRecovery() {
  if (!isNativeApp() || listener) return
  listener = App.addListener('appRestoredResult', result => {
    if (result.pluginId !== 'Camera' || result.methodName !== 'getPhoto') return
    const pending = pendingCameraCapture.value
    if (!pending || pending.id !== restoredCaptureId || pending.status !== 'pending') return
    if (Date.now() - pending.startedAt >= MAX_AGE) {
      discardCapture(pending.id)
      return
    }
    // Never fetch or emit here: restored results need an explicit user action.
    const photo = result.data as Photo | undefined
    try {
      save(result.success && typeof photo?.webPath === 'string'
        ? { ...pending, status: 'ready', photo: { webPath: photo.webPath, format: photo.format, saved: false } }
        : { ...pending, status: 'error' })
    } catch {
      pendingCameraCapture.value = { ...pending, status: 'error' }
    }
  })
  void listener.catch(() => { listener = undefined })
}
