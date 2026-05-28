import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// 优先读 .rpa-port 文件（服务器自动写入），其次读环境变量，最后默认 3456
function getApiPort(): string {
  const portFile = path.resolve(__dirname, '../.rpa-port')
  try {
    if (fs.existsSync(portFile)) {
      return fs.readFileSync(portFile, 'utf-8').trim()
    }
  } catch {}
  return process.env.RPA_PORT || '3456'
}

const API_PORT = getApiPort()

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
      '/ws': {
        target: `ws://localhost:${API_PORT}`,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
