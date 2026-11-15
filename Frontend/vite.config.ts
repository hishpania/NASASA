import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'

const apiTarget =
  process.env.WEBAPI_HTTP ?? process.env.services__webapi__http__0 ?? process.env.API_URL ?? 'http://localhost:5021'

export default defineConfig({
  // Icons are compiled from Iconify sets at build time, so only the ones imported via `~icons/...` ship.
  plugins: [react(), tailwindcss(), Icons({ compiler: 'jsx', jsx: 'react' })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
})
