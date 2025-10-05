import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './app/src'),
      '@/components': resolve(__dirname, './app/src/components'),
      '@/features': resolve(__dirname, './app/src/features'),
      '@/lib': resolve(__dirname, './app/src/lib'),
      '@/adapters': resolve(__dirname, './app/src/adapters'),
      '@/types': resolve(__dirname, './app/src/types'),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
