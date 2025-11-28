import importX from 'eslint-plugin-import-x'
import tseslint from 'typescript-eslint'
import vitest from '@vitest/eslint-plugin'
import { builtinModules } from 'node:module'
import { defineConfig } from 'eslint/config'

const DOMGlobals = ['window', 'document']
const NodeGlobals = ['module', 'require']

const banConstEnum = {
  selector: 'TSEnumDeclaration[const=true]',
  message:
    'Please use non-const enums. This project automatically inlines enums.',
}

export default defineConfig(
  {
    files: ['**/*.js', '**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.base],
    plugins: {
      'import-x': importX,
    },
    rules: {
      'no-debugger': 'error',
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      // most of the codebase are expected to be env agnostic
      'no-restricted-globals': ['error', ...DOMGlobals, ...NodeGlobals],

      'no-restricted-syntax': ['error', banConstEnum],
      'sort-imports': ['error', { ignoreDeclarationSort: true }],

      'import-x/no-nodejs-modules': [
        'error',
        { allow: builtinModules.map(mod => `node:${mod}`) },
      ],
      // This rule enforces the preference for using '@ts-expect-error' comments in TypeScript
      // code to indicate intentional type errors, improving code clarity and maintainability.
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      // Enforce the use of 'import type' for importing types
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      // Enforce the use of top-level import type qualifier when an import only has specifiers with inline type qualifiers
      '@typescript-eslint/no-import-type-side-effects': 'error',
    },
  },

  // release package
  {
    name: 'release',
    files: ['packages/release/src/**'],
    rules: {
      'no-console': 'off',
    },
  },

  // storage package
  {
    name: 'storage',
    files: ['packages/storage/src/**'],
    rules: {
      'no-restricted-globals': ['error', ...NodeGlobals],
    },
  },

  // playground packages
  {
    name: 'playground',
    files: ['playground/**'],
    rules: {
      'no-restricted-globals': 'off',
      'no-console': 'off',
    },
  },

  // tests, no restrictions (runs in Node / Vitest with jsdom)
  {
    files: ['**/__tests__/**', '**/*.{test,spec}.{js,ts,tsx}'],
    plugins: { vitest },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
    rules: {
      'no-console': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
      'vitest/no-disabled-tests': 'error',
      'vitest/no-focused-tests': 'error',
    },
  },

  // JavaScript files
  {
    files: ['*.js'],
    rules: {
      // We only do `no-unused-vars` checks for js files, TS files are checked by TypeScript itself.
      'no-unused-vars': ['error', { vars: 'all', args: 'none' }],
    },
  },

  // Node scripts and config files
  {
    files: [
      'eslint.config.js',
      '*.config.{js,ts}',
      'rolldown*.config.{js,ts}',
      'tsdown*.config.{js,ts}',
      'vitest.config.{js,ts}',
      'scripts/**',
      'packages/*/*.config.{js,ts}',
      'packages/napi/benchmark/*.{js,ts}',
    ],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-syntax': ['error', banConstEnum],
      'no-console': 'off',
    },
  },

  {
    ignores: [
      '**/dist/',
      '**/temp/',
      '**/coverage/',
      '**/node_modules/',
      '.idea/',
      'packages/*/templates/**',
      '**/templates/**',
      'docs/.vitepress/cache/**',
      'packages/napi/baicie-napi.{wasi,wasi-browser}.*',
      'packages/napi/index.d.ts',
    ],
  },
)
