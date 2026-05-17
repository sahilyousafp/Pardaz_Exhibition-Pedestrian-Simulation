import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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