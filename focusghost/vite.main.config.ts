import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
    },
  },
  build: {
    rollupOptions: {
      external: ['electron', 'electron-store', 'active-win', '@google/generative-ai'],
    },
  },
});
