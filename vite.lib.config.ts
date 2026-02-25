import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

// Produces dist/ for static hosting. Everything bundled, no externals.
// widget.js is copied in so the whole folder deploys as-is.
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-widget',
      closeBundle() {
        copyFileSync(
          resolve(__dirname, 'widget.js'),
          resolve(__dirname, 'dist', 'widget.js'),
        );
      },
    },
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {},
  },
});
