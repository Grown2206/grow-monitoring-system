import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Erlaubt Zugriff im Netzwerk (für Handy Test)
    port: 5173,
  }
})