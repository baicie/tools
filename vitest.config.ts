import { configDefaults, defineConfig } from 'vitest/config'
import { entries } from './scripts/aliases.js'

const unitIgnore = ['packages/napi/**', '**/e2e/**']

export default defineConfig({
  define: {
    __DEV__: true,
    __TEST__: true,
  },
  resolve: {
    alias: entries,
  },
  test: {
    globals: true,
    pool: 'threads',
    setupFiles: 'scripts/setup-vitest.ts',
    sequence: {
      hooks: 'list',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/*/src/**'],
      exclude: [],
    },
    exclude: ['**/templates/**'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          exclude: [...configDefaults.exclude, ...unitIgnore],
        },
      },
      {
        extends: true,
        test: {
          name: 'unit-jsdom',
          include: ['packages/*/*.{test,spec}.*'],
          exclude: [...configDefaults.exclude, ...unitIgnore],
          environment: 'jsdom',
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          environment: 'jsdom',
          include: ['packages/*/__tests__/e2e/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'napi',
          exclude: [...configDefaults.exclude, '**/e2e/**'],
          include: ['packages/napi/tests/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'napi-wasi',
          exclude: [...configDefaults.exclude, '**/e2e/**'],
          include: ['packages/napi-browser/tests/*.spec.ts'],
        },
      },
    ],
  },
})
