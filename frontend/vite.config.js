import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://192.168.1.128:8000',
      '/uploads': 'http://192.168.1.128:8000',
      '/heatmaps': 'http://192.168.1.128:8000',
    },
  },
})
