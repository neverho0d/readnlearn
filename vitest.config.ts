import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./app/tests/setup.ts'],
    globals: true,
  },
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
})
