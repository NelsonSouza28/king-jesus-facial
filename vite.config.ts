import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/kj-facial.svg', 'offline.html'],
      manifest: {
        id: '/',
        name: 'KING JESUS Facial',
        short_name: 'KJ Facial',
        description: 'Cadastro e reconhecimento facial integrado ao sistema KING JESUS.',
        theme_color: '#0b0b0b',
        background_color: '#0b0b0b',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['business', 'utilities'],
        icons: [
          {
            src: '/icons/kj-facial.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: []
      }
    })
  ]
});
