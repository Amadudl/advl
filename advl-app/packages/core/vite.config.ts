/**
 * vite.config.ts — Vite build configuration for @advl/core
 *
 * Builds the Core React application. Output goes to dist/ which is
 * served statically by the Server shell in server mode.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
