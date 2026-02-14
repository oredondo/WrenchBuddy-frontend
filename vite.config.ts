import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy para desarrollo local:
// - Frontend (Vite): http://localhost:5173
// - Backend (Django): http://localhost:8000
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api-auth': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/admin': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
      }
    },
  },
})
