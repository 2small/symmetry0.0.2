import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react()
  ],
  // Remove manual root/outDir keys to let Vinxi compile the full-stack bundle
  server: {
    preset: 'cloudflare-pages' 
  }
})
