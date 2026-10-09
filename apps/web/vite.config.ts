import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable, offline-capable app: a service worker precaches the built
    // app shell (HTML/JS/CSS/icons) so it loads with no network. Data already
    // lives in IndexedDB, so the whole app works offline. Only active in
    // production builds (`npm run build && npm run preview` to try it).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Seating Chart Builder',
        short_name: 'Seating',
        description: 'Plan tables and seat your guests — works offline.',
        theme_color: '#2563eb',
        background_color: '#f1f5f9',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Client-side routes (/events/:id) are served the app shell offline.
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: {
    port: 5173,
  },
  // Keep a single React instance so react-konva's reconciler can't end up with a
  // duplicate React (which crashes <Stage>). Pre-bundle only the canvas libs —
  // listing react/react-dom in optimizeDeps.include causes an "Outdated Optimize
  // Dep" reload loop, so we leave React to Vite's default handling.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react-konva', 'konva'],
  },
});
