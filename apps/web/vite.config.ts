import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
