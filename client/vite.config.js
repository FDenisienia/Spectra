import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Debe coincidir con PORT del server/.env. Cambiar si usás otro puerto.
const API_PORT = 3001

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          bootstrap: ['react-bootstrap', 'bootstrap'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
