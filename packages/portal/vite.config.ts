import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { Buffer } from 'buffer'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')

  return {
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
        '@repo/auth': path.resolve(__dirname, '../auth/src'),
        buffer: 'buffer/',
        stream: 'stream-browserify',
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'https://api-gateway.adrianodentalclinic.online',
          changeOrigin: true
        }
      }
    }
  }
})