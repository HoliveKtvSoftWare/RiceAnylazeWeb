import { fileURLToPath, URL } from 'node:url'
import process from 'node:process'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// 后端地址（FastAPI / uvicorn），前端通过同源反向代理访问，避免 CORS 与硬编码域名
const BACKEND = process.env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:8000'

// changeOrigin 保持 false：让 FastAPI 收到的 Host 仍是前端地址，
// 这样后端用 request.base_url 生成的 /static/... 图片地址也是同源的。
const proxy = {
  '/api': { target: BACKEND, changeOrigin: false },
  '/static': { target: BACKEND, changeOrigin: false },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: { proxy },
  preview: { proxy },
})


