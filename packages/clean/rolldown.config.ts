import { defineConfig } from 'rolldown'
import pkg from './package.json'
import { builtinModules } from 'node:module'
import { dts } from 'rolldown-plugin-dts'

const external = [
  ...Object.keys(pkg.dependencies),
  ...builtinModules,
  ...builtinModules.map(module => `node:${module}`),
]

export default defineConfig([
  {
    input: ['./src/index.ts', './src/cli.ts'],
    output: {
      format: 'esm',
      dir: './dist',
      entryFileNames: '[name].js',
    },
    external,
  },
  {
    input: ['./src/index.ts'],
    output: {
      format: 'esm',
      dir: './dist',
    },
    plugins: [dts({ emitDtsOnly: true })],
    external,
  },
])
