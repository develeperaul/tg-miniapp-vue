import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Finclub App',
        short_name: 'Finclub',
        theme_color: '#ffffff',
        // Пути к иконкам (должны лежать в папке public/)
        icons: [
          {
            src: 'finclub-icon.png',
            sizes: '512x512',
            type: 'image/png'
          },
        ]
      }
    })
  ],
  server: {
    port: 5173
  },
  
})
