import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, RollupOptions } from 'rollup'
import { defineConfig } from 'rollup'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import MagicString from 'magic-string'
import { findWorkspacePackages } from '@pnpm/find-workspace-packages'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const getWorkspacePackages = () => findWorkspacePackages('./')

async function createExternal() {
  const pkgs = Object.fromEntries(
    (await getWorkspacePackages()).map(pkg => [pkg.manifest.name!, pkg]),
  )

  const pkg = pkgs['@baicie/tools']

  return [...Object.keys(pkg.manifest.dependencies ?? {}), ...Object.keys(pkg.manifest.devDependencies ?? {}), 'esbuild']
}

async function createNodeConfig() {
  return defineConfig({
    treeshake: true,
    output: {
      dir: './dist',
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/dep-[hash].js',
      exports: 'named',
      format: 'cjs',
      externalLiveBindings: false,
      freeze: false,
      sourcemap: true,
    },
    onwarn(warning, warn) {
      if (warning.message.includes('Circular dependency'))
        return
      warn(warning)
    },
    input: {
      index: path.resolve(__dirname, 'src/index.ts'),
      // cli: path.resolve(__dirname, 'src/node/cli.ts'),
    },
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      typescript({
        tsconfig: path.resolve(__dirname, 'src/tsconfig.json'),
        sourceMap: false,
        declaration: false,
        declarationDir: './dist',
      }),
      commonjs({
        extensions: ['.js'],
        ignore: ['bufferutil', 'utf-8-validate'],
      }),
      json(),
      // cjsPatchPlugin(),
    ],
    external: await createExternal(),
  })
}

export function cjsPatchPlugin(): Plugin {
  const cjsPatch = `
import { fileURLToPath as __cjs_fileURLToPath } from 'node:url';
import { dirname as __cjs_dirname } from 'node:path';
import { createRequire as __cjs_createRequire } from 'node:module';

const __filename = __cjs_fileURLToPath(import.meta.url);
const __dirname = __cjs_dirname(__filename);
const require = __cjs_createRequire(import.meta.url);
const __require = require;
`.trimStart()

  return {
    name: 'cjs-chunk-patch',
    renderChunk(code, chunk) {
      if (!chunk.fileName.includes('chunks/dep-'))
        return

      const match = code.match(/^(?:import[\s\S]*?;\s*)+/)
      const index = match ? match.index! + match[0].length : 0
      const s = new MagicString(code)
      // inject after the last `import`
      s.appendRight(index, cjsPatch)

      return {
        code: s.toString(),
        map: s.generateMap({ hires: true }),
      }
    },
  }
}

// 打印rollup参数
export default async (): Promise<RollupOptions> => {
  return await createNodeConfig()
}
