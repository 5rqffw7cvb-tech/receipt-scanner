import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  // Allow overriding base path for GitHub Pages via env
  base: process.env.BASE_PATH || '/',
  server: {
    host: true,
    port: 5173
  }
}))
