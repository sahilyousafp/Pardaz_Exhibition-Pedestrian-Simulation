import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: [
      'frontend-production-bd98.up.railway.app',
      'localhost',
      '127.0.0.1'
    ]
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': process.env.VITE_BACKEND_HOST || 'http://localhost:8000',
      '/uploads': process.env.VITE_BACKEND_HOST || 'http://localhost:8000',
      '/heatmaps': process.env.VITE_BACKEND_HOST || 'http://localhost:8000',
    },
  },
})