import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react()
  ],
  server: {
    // This tells the framework to compile server bundles for Cloudflare Workers/Pages
    preset: 'cloudflare-pages' 
  },
  root: 'src/symmetry', 
  build: {
    // We redirect the output directory to match where wrangler looks
    outDir: '../../.output/public', 
    emptyOutDir: true
  }
})
