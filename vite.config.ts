import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['structures/**/*.svg', 'icon.svg', 'icon-192.png', 'icon-512.png'],
    manifest: {
      name: '氨基酸 · 记忆练习', short_name: '氨基酸', lang: 'zh-CN',
      start_url: './', scope: './', display: 'standalone',
      background_color: '#f4f6fa', theme_color: '#2f4161',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'], navigateFallback: 'index.html', cleanupOutdatedCaches: true, clientsClaim:true },
  })],
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
