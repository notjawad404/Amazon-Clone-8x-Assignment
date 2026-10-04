import process from 'node:process'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const SERVER_DIR = fileURLToPath(new URL('../server', import.meta.url))

function apiProxyTarget(mode) {
  const clientEnv = loadEnv(mode, process.cwd(), '')
  if (clientEnv.API_PROXY_TARGET) return clientEnv.API_PROXY_TARGET
  const serverEnv = loadEnv(mode, SERVER_DIR, '')
  return `http://localhost:${serverEnv.PORT || 5000}`
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': apiProxyTarget(mode) },
  },
}))
