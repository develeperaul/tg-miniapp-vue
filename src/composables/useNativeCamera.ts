import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet'
import { Camera, CameraResultType, CameraSource, type Photo } from '@capacitor/camera'
import { isNativeApp } from '../utils/native'

export type AttachmentSource = 'camera' | 'gallery' | 'files'

export async function chooseAttachmentSource(): Promise<AttachmentSource | null> {
  const result = await ActionSheet.showActions({
    title: 'Добавить вложение', cancelable: true,
    options: [
      { title: 'Камера' }, { title: 'Галерея' }, { title: 'Файлы (загрузки)' },
      { title: 'Отмена', style: ActionSheetButtonStyle.Cancel },
    ],
  })
  return result.canceled ? null : (['camera', 'gallery', 'files'] as const)[result.index] ?? null
}

export async function takeNativePhoto(source: 'camera' | 'gallery' = 'camera', onPhoto?: (photo: Photo) => void): Promise<File | null> {
  if (!isNativeApp()) return null
  if (source === 'camera') {
    let permission = await Camera.checkPermissions()
    if (permission.camera === 'prompt' || permission.camera === 'prompt-with-rationale') {
      permission = await Camera.requestPermissions({ permissions: ['camera'] })
    }
    if (permission.camera !== 'granted') {
      throw new Error('Разрешите доступ к камере в настройках приложения.')
    }
  }
  try {
    // getPhoto remains supported in v8.0 and v8.1; URI avoids base64 memory overhead.
    const photo = await Camera.getPhoto({
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos, resultType: CameraResultType.Uri,
      quality: 85, width: 1920, height: 1920, saveToGallery: false,
    })
    onPhoto?.(photo)
    return await photoToFile(photo)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/cancel|canceled|cancelled/i.test(message)) return null
    throw new Error(source === 'camera' ? 'Не удалось сделать фотографию. Проверьте доступ к камере.' : 'Не удалось выбрать фотографию из галереи.')
  }
}

export async function photoToFile(photo: Photo, restored = false): Promise<File> {
  // A restored URI must be local; never fetch a remote URL supplied by a result.
  if (!photo.webPath || (restored && !isLocalPhotoPath(photo.webPath))) {
    throw new Error('Не удалось прочитать фотографию.')
  }
  const response = await fetch(photo.webPath)
  if (!response.ok) throw new Error('Не удалось прочитать фотографию.')
  const blob = await response.blob()
  const format = photo.format === 'png' ? 'png' : 'jpeg'
  return new File([blob], `photo-${Date.now()}.${format}`, { type: `image/${format}` })
}

function isLocalPhotoPath(path: string): boolean {
  try {
    const url = new URL(path, window.location.href)
    return url.origin === window.location.origin &&
      (url.pathname.startsWith('/_capacitor_file_/') || url.pathname.startsWith('/_capacitor_content_/'))
  } catch { return false }
}
