import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  // ═══════════════════════════════════════════════════════════════
  // DEPLOYMENT ENVIRONMENT CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  const isDev = mode === 'development'
  const isStaging = process.env.VITE_ENV === 'staging'
  const isProd = mode === 'production' && !isStaging

  // Base path for deployment (GitHub Pages / production)
  // - Default '/' for dev/preview so local usage doesn't 404 assets.
  // - Use '/yO3-platform/' only for production builds.
  // - Override anytime with VITE_BASE (useful for custom hosting paths).
  const explicitBase = process.env.VITE_BASE
  const isProdBuild =
    command === 'build' &&
    (mode === 'production' || process.env.NODE_ENV === 'production')
  const base = explicitBase || (isProdBuild ? '/yO3-platform/' : '/')

  // Build timestamp for versioning
  const buildTime = new Date().toISOString()

  return {
    plugins: [react()],

    base,

    // Environment variables injection
    define: {
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      'import.meta.env.VITE_ENV': JSON.stringify(isStaging ? 'staging' : (isProd ? 'production' : 'development')),
    },

    // Path aliases matching tsconfig.json
    resolve: {
      alias: {
        '@contracts': path.resolve(__dirname, './src/contracts'),
        '@system': path.resolve(__dirname, './src/system'),
        '@agent': path.resolve(__dirname, './src/system/teraApi-frontend/agent'),
        '@device': path.resolve(__dirname, './src/system/teraApi-frontend/device'),
        '@video': path.resolve(__dirname, './src/system/teraApi-frontend/video'),
        '@auth': path.resolve(__dirname, './src/system/teraApi-frontend/auth'),
        '@ops': path.resolve(__dirname, './src/system/teraApi-frontend/ops'),
        '@observability': path.resolve(__dirname, './src/system/teraApi-frontend/observability'),
        '@analytics': path.resolve(__dirname, './src/system/teraApi-frontend/analytics'),
        '@docs': path.resolve(__dirname, './src/system/teraApi-frontend/docs'),
        '@services': path.resolve(__dirname, './src/infrastructure/api/adapters'),
        '@components': path.resolve(__dirname, './src/infrastructure/presentation/components'),
        '@types': path.resolve(__dirname, './src/domain/types'),
        '@types/*': path.resolve(__dirname, './src/domain/types'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@hooks': path.resolve(__dirname, './src/application/hooks'),
        '@contexts': path.resolve(__dirname, './src/contexts'),
        '@store': path.resolve(__dirname, './src/infrastructure/store'),
        '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
        '@application': path.resolve(__dirname, './src/application'),
        '@domain': path.resolve(__dirname, './src/domain'),
        "@generated": path.resolve(__dirname, "./src/domain/generated"),
        "@mappers": path.resolve(__dirname, "./src/infrastructure/api/mappers"),
        "@pages": path.resolve(__dirname, "./src/pages")
      },
    },

    // Enable Web Workers with ES module format
    worker: {
      format: 'es',
    },

    // Development server configuration
    server: {
      port: 5173,
      host: true,

      // Security headers for Web Crypto API and SharedArrayBuffer
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },

      // Proxy configuration for all backend services
      proxy: {
        // Unified API Gateway Ingress (Blue Flow)
        '/api': {
          target: 'http://localhost:8091',
          changeOrigin: true,
          secure: false,
        },

        // Edge Node WebSocket (live streaming)
        '/ws': {
          target: 'ws://localhost:8090',
          ws: true,
          changeOrigin: true,
        },
      },
    },

    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: isDev ? 'inline' : false,
      minify: isProd ? 'esbuild' : false,
      target: 'es2020',

      rollupOptions: {
        output: {
          // Asset naming for cache busting
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
        },
      },

      chunkSizeWarningLimit: 1000,
      
      // Performance optimizations
      cssCodeSplit: true,
      reportCompressedSize: !isDev,
    },

    // Dependency optimization
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
      exclude: ['@vite/client', '@vite/env'],
    },

    // Preview server (for testing production builds locally)
    preview: {
      port: 4173,
      host: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // LOGGING & TELEMETRY
    // ═══════════════════════════════════════════════════════════════
    // Vite's internal logging
    logLevel: isDev ? 'info' : 'warn',
    clearScreen: false,
  }
})
