import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    cors: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        builder: 'builder.html',
      },
    },
  },
});
