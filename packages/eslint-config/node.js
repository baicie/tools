/**
 * @baicie/eslint-config - Node.js ESLint Configuration
 *
 * Extends the base configuration with Node.js-specific rules.
 * Use this for backend Node.js projects and CLI tools.
 */
import base from './base.js'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,

  {
    name: 'baicie/node',

    languageOptions: {
      globals: {
        // Node.js globals
        node: true,
        // CommonJS globals (for mixed projects)
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },

    rules: {
      // Node.js specific rules
      'no-console': 'off',
      'no-process-exit': 'off',
    },
  },
]
