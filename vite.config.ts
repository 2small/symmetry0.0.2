import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'src/symmetry', // 👈 Redirects Vite's entry point to the src folder
  build: {
    outDir: '../../dist', // 👈 Output to the project root's dist folder (outDir is relative to `root`)
    emptyOutDir: true
  }
})
