import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  // GitHub Pages base path
  base: process.env.BASE_PATH || '/receipt-scanner/',
  server: {
    host: true,
    port: 5173
  }
}))
