import { onBeforeUnmount } from 'vue'

// Keep the selected file visible even when temporary server media is private.
// Server UUIDs are used for submission; blob URLs belong only to this UI instance.
export function useAttachmentPreview() {
  const urls = new Set<string>()
  function create(file: File) {
    const image = file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name)
    if (!image) return { preview: file.name, noimg: true }
    const preview = URL.createObjectURL(file)
    urls.add(preview)
    return { preview, noimg: false }
  }
  function release(preview?: string) {
    if (preview && urls.delete(preview)) URL.revokeObjectURL(preview)
  }
  function clear() {
    for (const url of urls) URL.revokeObjectURL(url)
    urls.clear()
  }
  onBeforeUnmount(clear)
  return { create, release, clear }
}
