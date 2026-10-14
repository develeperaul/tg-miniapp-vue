import { defineBoot } from '#q-app'
import { initTelegram } from '../plugins/telegram'
export default defineBoot(() => { void initTelegram() })
