import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
      manifest: {
        name: 'BovItzá',
        short_name: 'BovItzá',
        description: 'Tu ganado, tus fincas y tus números en un solo lugar.',
        lang: 'es-GT',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f3f5ef',
        theme_color: '#173f35',
        orientation: 'any',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/'),
          handler: 'NetworkFirst',
          options: { cacheName: 'bovitza-api', networkTimeoutSeconds: 5, expiration: { maxEntries: 200, maxAgeSeconds: 86400 } }
        }]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'https://localhost:7055', secure: false } }
  }
})
