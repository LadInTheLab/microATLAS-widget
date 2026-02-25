import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server + pages build (builder.html). The lib build runs first via
// vite.lib.config.ts, then this config adds the HTML pages into dist/.
export default defineConfig({
  plugins: [react()],
  base: '/microATLAS-widget/',
  server: {
    port: 5173,
    cors: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        builder: 'builder.html',
      },
    },
  },
});
