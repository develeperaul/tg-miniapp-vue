import { Capacitor } from '@capacitor/core'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import { isNativeApp } from '../utils/native'

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
const sizeError = () => new Error('Размер файла не должен превышать 20 МБ.')

export async function pickNativeFile(pdfOnly = false, isCurrent = () => true): Promise<File | null> {
  if (!isNativeApp()) return null
  let result
  try {
    result = await FilePicker.pickFiles({
      limit: 1, readData: false,
      ...(pdfOnly ? { types: ['application/pdf'] } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: string })?.message || error)
    if (/\bcancell?ed\b|\bcancel\b/i.test(message)) return null
    throw new Error('Не удалось открыть выбор файла.')
  }
  if (!isCurrent()) return null
  const picked = result.files[0]
  if (!picked) return null
  // Refuse unknown sizes too: never read an unbounded provider result into memory.
  if (!Number.isFinite(picked.size) || picked.size < 0) throw new Error('Не удалось определить размер файла.')
  if (picked.size > MAX_ATTACHMENT_BYTES) throw sizeError()
  if (pdfOnly && picked.mimeType !== 'application/pdf' && !/\.pdf$/i.test(picked.name)) {
    throw new Error('Выберите документ PDF.')
  }
  if (!picked.path || !/^(?:file:\/\/|content:\/\/|\/)/i.test(picked.path)) {
    throw new Error('Не удалось прочитать выбранный файл.')
  }
  const response = await fetch(Capacitor.convertFileSrc(picked.path))
  if (!isCurrent()) return null
  if (!response.ok) throw new Error('Не удалось прочитать выбранный файл.')
  const length = response.headers.get('content-length')
  if (length && Number(length) > MAX_ATTACHMENT_BYTES) throw sizeError()
  const blob = await response.blob()
  if (!isCurrent()) return null
  if (blob.size > MAX_ATTACHMENT_BYTES) throw sizeError()
  const file = new File([blob], picked.name, { type: picked.mimeType || blob.type })
  if (file.size > MAX_ATTACHMENT_BYTES) throw sizeError()
  return file
}
