import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      exclude: ['http', 'https', 'url', 'zlib', 'stream'],
      protocolImports: false,
    }),
  ],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5178,
    proxy: {
      '/api': {
        target: 'https://api-gateway.adrianodentalclinic.online',
        changeOrigin: true
      }
    }
  },
})
