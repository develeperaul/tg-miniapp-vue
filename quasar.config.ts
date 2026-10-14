import { defineConfig } from '#q-app'

export default defineConfig(() => ({
  boot: ['telegram'],
  css: ['app.scss'],
  extras: ['material-icons'],
  framework: {
    lang: 'ru',
    iconSet: 'material-icons',
    plugins: ['Notify', 'Dialog', 'Loading']
  },
  devServer: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    vueRouterMode: 'history',
    // The existing application uses import.meta.env.VITE_* throughout its API/Firebase integrations.
    env: { clientPrefix: ['VITE_', 'QCLI_'] }
  },
  pwa: {
    workboxMode: 'InjectManifest',
    swFilename: 'firebase-messaging-sw.js',
    manifestFilename: 'finclub.webmanifest',
    // Keep the existing 4.5 MiB map image cacheable.
    extendPWAInjectManifestOptions(cfg) {
      cfg.maximumFileSizeToCacheInBytes = 5 * 1024 * 1024
      cfg.globPatterns = ['**/*.{js,css,html,ico,png,svg}']
    }
  }
}))
