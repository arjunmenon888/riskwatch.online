import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The Docker Compose setup handles hot reloading.
    // The 'CHOKIDAR_USEPOLLING=true' env var is for that.
  }
})