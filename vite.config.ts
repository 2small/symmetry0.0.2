import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'src/symmetry', // 👈 Redirects Vite's entry point to the src folder
  build: {
    outDir: '../dist', // 👈 Forces the compiled build to output to the project root's dist folder
    emptyOutDir: true
  }
})
