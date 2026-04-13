/**
 * @baicie/eslint-config - React ESLint Configuration
 *
 * Extends the base configuration with React-specific rules and plugins.
 * Use this for React and React Native projects.
 */
import { FlatCompat } from '@eslint/eslintrc'
import base from './base.js'
import react from 'eslint-plugin-react'
import hooks from 'eslint-plugin-react-hooks'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({
  baseDirectory: __dirname,
})

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,

  // Get react plugin's recommended config
  ...compat.config(react.configs.recommended),

  {
    name: 'baicie/react',

    plugins: {
      react,
      'react-hooks': hooks,
    },

    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      // React rules
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
