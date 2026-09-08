import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// The viewer is a separate root inside the same package: it shares the core types with the pipeline
// rather than redeclaring the document contract a second time.
export default defineConfig({
  root: resolve(import.meta.dirname, '.'),
  plugins: [react()],
  build: {
    outDir: resolve(import.meta.dirname, '../dist/viewer'),
    emptyOutDir: true,
  },
  server: {
    fs: { allow: ['..'] },
    port: 5173,
    proxy: { '/api': 'http://localhost:8787' },
  },
});
