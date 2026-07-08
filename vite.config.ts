import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/new-hope-ai-/' : '/',
  plugins: [vue()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/cytoscape')) return 'cytoscape'
          if (id.includes('node_modules/naive-ui') || id.includes('node_modules/date-fns') || id.includes('node_modules/vooks') || id.includes('node_modules/css-render')) return 'naive'
          if (id.includes('node_modules/katex')) return 'katex'
          if (id.includes('node_modules/marked') || id.includes('node_modules/mdurl') || id.includes('node_modules/punycode') || id.includes('node_modules/uc.micro')) return 'marked'
          if (id.includes('node_modules/highlight') || id.includes('node_modules/@highlightjs')) return 'highlightjs'
        },
      },
    },
  },
  server: {
    allowedHosts: ['.monkeycode-ai.online']
  }
}))
