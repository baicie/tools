import fs from 'node:fs'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'

import { dts } from 'rolldown-plugin-dts'

import { build } from 'rolldown'
import type { BuildOptions, Plugin } from 'rolldown'

const __dirname = nodePath.join(fileURLToPath(import.meta.url), '..')

const buildMeta = (function makeBuildMeta() {
  // In `@rolldown/browser`, there will be two builds:
  // - ESM for Node (used in StackBlitz / WebContainers)
  // - ESM for browser bundlers (used in Vite and running in the browser)
  type TargetBrowserPkg = 'browser-pkg'

  // Refer to `rolldown` package
  type TargetRolldownPkg = 'rolldown-pkg'

  type TargetRolldownPkgWasi = 'rolldown-pkg-wasi'

  const target: TargetBrowserPkg | TargetRolldownPkg | TargetRolldownPkgWasi =
    (function determineTarget() {
      switch (process.env.TARGET) {
        case undefined:
        case 'rolldown':
          return 'rolldown-pkg'
        case 'browser':
          return 'browser-pkg'
        case 'rolldown-wasi':
          return 'rolldown-pkg-wasi'
        default:
          console.warn(
            `Unknown target: ${process.env.TARGET}, defaulting to 'rolldown-pkg'`,
          )
          return 'rolldown-pkg'
      }
    })()

  const pkgRoot =
    target === 'browser-pkg'
      ? nodePath.resolve(__dirname, '../browser')
      : __dirname

  return {
    isCI: !!process.env.CI,
    isReleasingPkgInCI: !!process.env.RELEASING,
    target,
    pkgRoot,
    buildOutputDir: nodePath.resolve(pkgRoot, 'dist'),
    pkgJson: JSON.parse(
      fs.readFileSync(nodePath.resolve(pkgRoot, 'package.json'), 'utf-8'),
    ),
    desireWasmFiles: target === 'browser-pkg' || target === 'rolldown-pkg-wasi',
  }
})()

const bindingFile = nodePath.resolve('src/binding.cjs')
const bindingFileWasi = nodePath.resolve('src/rolldown-binding.wasi.cjs')
const bindingFileWasiBrowser = nodePath.resolve(
  'src/rolldown-binding.wasi-browser.js',
)

const configs: BuildOptions[] = [
  withShared({
    plugins: [dts()],
    output: {
      dir: buildMeta.buildOutputDir,
      format: 'esm',
      entryFileNames: `[name].mjs`,
      chunkFileNames: `shared/[name]-[hash].mjs`,
    },
  }),
]

if (buildMeta.target === 'browser-pkg') {
  let init = withShared({
    browserBuild: true,
    output: {
      dir: buildMeta.buildOutputDir,
      format: 'esm',
      entryFileNames: '[name].browser.mjs',
    },
  })
  init.transform ??= {}
  init.transform.define = {
    ...init.transform.define,
    // `experimental-index` now dependents on `logger` in cli to emit warning which require `process.env.ROLLDOWN_TEST` to initialize logger correctly.
    // But in browser build, we don't have `process.`, so we polyfill them
    'process.env.ROLLDOWN_TEST': 'false',
  }
  configs.push(init)
}

;(async () => {
  // clean up unused files that may be left from previous builds
  fs.rmSync(buildMeta.buildOutputDir, { recursive: true, force: true })
  fs.mkdirSync(buildMeta.buildOutputDir, { recursive: true })

  for (const config of configs) {
    await build(config)
  }
})()

function withShared({
  browserBuild: isBrowserBuild,
  ...options
}: { browserBuild?: boolean } & BuildOptions): BuildOptions {
  return {
    input: {
      index: './src/index',
    },
    platform: isBrowserBuild ? 'browser' : 'node',
    resolve: {
      extensions: ['.js', '.cjs', '.mjs', '.ts'],
    },
    external: [
      /@baicie\/binding-.*/,
      /baicie-binding\.wasi\.cjs/,
      ...Object.keys(buildMeta.pkgJson.dependencies ?? {}),
    ],
    // Do not move this line up or down, it's here for a reason
    ...options,
    plugins: [
      buildMeta.desireWasmFiles && resolveWasiBinding(isBrowserBuild),
      isBrowserBuild && removeBuiltModules(),
      options.plugins,
    ],
    treeshake: {
      moduleSideEffects: [{ test: /\/signal-exit\//, sideEffects: false }],
    },
    transform: {
      target: 'node22',
      decorator: {
        // Legacy decorators are required for the @lazyProp decorator
        legacy: true,
      },
      define: {
        'import.meta.browserBuild': String(isBrowserBuild),
      },
    },
  }
}

// alias binding file to rolldown-binding.wasi.js and mark it as external
// alias its dts file to rolldown-binding.d.ts without external
function resolveWasiBinding(isBrowserBuild?: boolean): Plugin {
  return {
    name: 'resolve-wasi-binding',
    resolveId: {
      filter: { id: /\bbinding\b/ },
      async handler(id, importer, options) {
        const resolution = await this.resolve(id, importer, options)

        if (resolution?.id === bindingFile) {
          const id = isBrowserBuild ? bindingFileWasiBrowser : bindingFileWasi
          return { id, external: 'relative' }
        }

        return resolution
      },
    },
  }
}

function removeBuiltModules(): Plugin {
  return {
    name: 'remove-built-modules',
    resolveId: {
      filter: { id: /^node:/ },
      handler(id, importer) {
        if (id === 'node:path') {
          return this.resolve('pathe')
        }
        if (
          id === 'node:os' ||
          id === 'node:worker_threads' ||
          id === 'node:url' ||
          id === 'node:fs/promises' ||
          id === 'node:fs' ||
          id === 'node:util'
        ) {
          // conditional import
          return { id, external: true, moduleSideEffects: false }
        }
        throw new Error(`Unresolved module: ${id} from ${importer}`)
      },
    },
  }
}
