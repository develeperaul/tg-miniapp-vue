// src/telegram.ts
import {
  init,
  miniApp,
  viewport,
  mainButton,
  backButton,
  closingBehavior
} from '@telegram-apps/sdk'
import { ref } from 'vue'

// реактивный флаг: реально ли мы в Mini App
export const isMiniApp = ref(false)

let initialized = false

export async function initTelegram() {
  if (initialized) return
  try {
    await init()

    if (miniApp.mount.isAvailable()) {
      miniApp.mount()
      isMiniApp.value = true
    }

    if (viewport.mount.isAvailable()) {
      await viewport.mount()
      if (viewport.expand.isAvailable()) {
        viewport.expand()
      }
    }

    if (mainButton.mount.isAvailable()) {
      mainButton.mount()
    }

    if (backButton.mount.isAvailable()) {
      backButton.mount()
    }

    if (closingBehavior.disableClose.isAvailable()) {
      closingBehavior.disableClose()
    }

    initialized = true
  } catch (err) {
    console.warn('[Telegram SDK v3] Init error:', err)
    isMiniApp.value = false
  }
}
