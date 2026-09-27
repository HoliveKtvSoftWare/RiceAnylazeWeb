import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

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
  server: {
    watch: {
      // 编辑工具用 "<name>.<pid>.<uuid>.tmpdir/<name>.tmp" 做原子写。
      // Vite 会去 watch 这个转瞬即逝的临时目录，拿到 EBUSY 后直接把 dev server
      // 整个打挂（不是 HMR 报错，而是进程退出），所以这里忽略掉。
      ignored: ['**/*.tmpdir/**', '**/.*.tmpdir/**', '**/*.tmp'],
    },
  },
})


