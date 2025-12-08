import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import pkg from './package.json'

const external = [...Object.keys(pkg.dependencies || {})]

export default defineConfig([
  {
    input: './src/index.ts',
    plugins: [dts({ emitDtsOnly: true })],
    platform: 'node',
    external,
  },
  {
    input: './src/index.ts',
    output: [
      {
        format: 'cjs',
        dir: 'dist',
        entryFileNames: 'index.cjs',
        sourcemap: true,
      },
      {
        format: 'esm',
        dir: 'dist',
        entryFileNames: 'index.js',
        sourcemap: true,
      },
    ],
    platform: 'node',
    external,
  },
])
