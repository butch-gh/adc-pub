import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'global': 'globalThis',
    'process.env': {},
    'process': {
      env: {},
      cwd: () => '/',
      platform: 'browser'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'buffer': 'buffer/',
      'stream': 'stream-browserify',
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'https://api-gateway.adrianodentalclinic.online',
        changeOrigin: true
      }
    }
  }
})
