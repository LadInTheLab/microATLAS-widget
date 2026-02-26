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
      // deck.gl throws a fatal error when it detects another version on
      // globalThis.deck (e.g. Curvenote ships v9). Since we bundle our own
      // copy, downgrade the throw to a console.warn so both can coexist.
      name: 'patch-deckgl-version-check',
      renderChunk(code) {
        const pattern = 'throw new Error("deck.gl - multiple versions detected: "';
        if (code.includes(pattern)) {
          return code.replace(
            /throw new Error\("deck\.gl - multiple versions detected: "\.concat\((\w+), " vs "\)\.concat\((\w+)\)\)/,
            'console.warn("deck.gl - multiple versions detected: ".concat($1, " vs ").concat($2))',
          );
        }
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
