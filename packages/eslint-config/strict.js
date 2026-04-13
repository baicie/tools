/**
 * @baicie/eslint-config - Strict ESLint Configuration
 *
 * Extends the base configuration with stricter rules for projects
 * that require more rigorous code quality standards.
 */
import base from './base.js'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,

  {
    rules: {
      // Stricter TypeScript rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      // Stricter import rules
      'import/no-cycle': 'error',
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'error',

      // Stricter unused vars rules
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Prefer const
      'prefer-const': 'error',

      // No debugger
      'no-debugger': 'error',
    },
  },
]
