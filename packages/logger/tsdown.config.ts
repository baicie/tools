import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['cjs', 'esm', 'iife'],
  dts: true,
  outputOptions: {
    name: 'BaicieLogger',
  },
})
