import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Carga PORT desde server/.env (mismo valor que usa Express). Prefijo '' = todas las variables.
export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, path.resolve(__dirname, '../server'), '')
  const API_PORT = serverEnv.PORT || '3000'

  return {
    plugins: [react()],
    server: {
      // 5173 suele estar ocupado por otros Vite; cambiá si también está en uso
      port: 5174,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${API_PORT}`,
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
  }
})
