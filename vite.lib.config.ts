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
      // deck.gl and luma.gl register on globalThis and throw fatal errors
      // if they find a different version already there (e.g. Curvenote ships
      // vis.gl v9). Redirect all globalThis.deck / globalThis.luma references
      // to bundle-private objects so our copy is fully isolated from the host.
      name: 'isolate-visgl-globals',
      renderChunk(code) {
        if (!code.includes('globalThis.deck') && !code.includes('globalThis.luma')) {
          return;
        }
        const header = 'let __deckNS, __lumaNS;\n';
        return header + code
          .replace(/globalThis\.deck\b/g, '__deckNS')
          .replace(/globalThis\.luma\b/g, '__lumaNS');
      },
    },
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
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
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
