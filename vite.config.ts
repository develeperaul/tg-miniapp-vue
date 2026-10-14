import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'
export default defineConfig({
  plugins: [vue(),
    VitePWA({
  strategies: 'injectManifest',
  srcDir: '',              // <--- Указываем смотреть в public
  filename: 'firebase-messaging-sw.js', 
      injectRegister: 'inline', 
  injectManifest: {
    injectionPoint: 'self.__WB_MANIFEST', 
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    // Public assets include a map image larger than Workbox's 2 MiB default.
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
  devOptions: {
    enabled: true, // Включаем для тестов
    type: 'module'
  },
  manifest: {
    name: 'Finclub App',
    short_name: 'Finclub',
    theme_color: '#ffffff',
    icons: [
      {
        src: 'finclub-icon.png',
        sizes: '512x512',
        type: 'image/png'
      },
    ]
  }
}),
    
    // basicSsl()
  ],
  server: {
    port: 5173,
    host: true 
  },
  
})
