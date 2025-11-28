import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@baicie/storage': resolve(__dirname, '../../packages/storage/src'),
    },
  },
})
