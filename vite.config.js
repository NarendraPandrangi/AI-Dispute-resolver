import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/krutrim': {
        target: 'https://cloud.olakrutrim.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/krutrim/, ''),
        secure: false,
      }
    }
  }
})
