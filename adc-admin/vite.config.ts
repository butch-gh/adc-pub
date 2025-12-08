import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Exclude specific globals that should not be polyfilled
      exclude: ['http', 'https', 'url', 'zlib', 'stream'],
      // Whether to polyfill `node:` protocol imports
      protocolImports: false,
    }),
  ],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'services': path.resolve(__dirname, './src/services'),
      'components': path.resolve(__dirname, './src/components'),
      'views': path.resolve(__dirname, './src/views'),
      'utils': path.resolve(__dirname, './src/utils'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 5177,
    proxy: {
      '/api': {
        target: 'https://api-gateway.adrianodentalclinic.online',
        changeOrigin: true
      }
    }
  }
})
