import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@system': path.resolve(__dirname, './src/system'),
      '@agent': path.resolve(__dirname, './src/system/teraApi-frontend/agent'),
      '@device': path.resolve(__dirname, './src/system/teraApi-frontend/device'),
      '@video': path.resolve(__dirname, './src/system/teraApi-frontend/video'),
      '@auth': path.resolve(__dirname, './src/system/teraApi-frontend/auth'),
      '@ops': path.resolve(__dirname, './src/system/teraApi-frontend/ops'),
      '@observability': path.resolve(__dirname, './src/system/teraApi-frontend/observability'),
      '@analytics': path.resolve(__dirname, './src/system/teraApi-frontend/analytics'),
      '@docs': path.resolve(__dirname, './src/system/teraApi-frontend/docs'),
      '@services': path.resolve(__dirname, './src/services'),
      '@components': path.resolve(__dirname, './src/components'),
      '@types': path.resolve(__dirname, './src/types'),
      '@types/*': path.resolve(__dirname, './src/types'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
    css: true,
  },
})
