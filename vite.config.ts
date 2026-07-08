import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/new-hope-ai-/',
  plugins: [vue()],
  server: {
    allowedHosts: ['.monkeycode-ai.online']
  }
})
