import { defineStore } from '#q-app'
import { createPinia } from 'pinia'

// Quasar creates the same Pinia instance used by the existing src/stores/* modules.
export default defineStore(() => createPinia())
