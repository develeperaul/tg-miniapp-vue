import { defineBoot } from '#q-app'
import { initTelegram } from '../plugins/telegram'

// Preserve Telegram Mini App initialization from the former src/main.ts entry point.
export default defineBoot(() => {
  void initTelegram()
})
