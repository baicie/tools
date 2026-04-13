/**
 * @baicie/eslint-config - Vue.js ESLint Configuration
 *
 * Extends the base configuration with Vue.js and Vue 3 Composition API rules.
 * Use this for Vue.js frontend projects (Vue 2 or Vue 3).
 */
import base from './base.js'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,

  {
    name: 'vue/parser',
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        extraFileExtensions: ['.vue'],
      },
    },
  },

  // Vue recommended config
  ...vuePlugin.configs['vue3-recommended'],

  {
    name: 'vue/rules',
    files: ['**/*.vue'],
    rules: {
      // Vue specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',
      'vue/require-explicit-emits': 'error',
      'vue/v-on-event-hyphenation': ['error', 'always', { autofix: true }],
      'vue/define-emits-declaration': ['error', 'type-based'],
      'vue/define-macros-emulation': [
        'error',
        ['defineProps', 'defineSlots', 'defineEmits', 'defineExpose'],
      ],
      'vue/no-unused-vars': 'error',

      // Vue 3 Composition API
      'vue/component-api-style': ['error', ['script setup']],
      'vue/component-tags-order': [
        'error',
        { order: ['script', 'template', 'style'] },
      ],
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/no-useless-v-bind': 'error',
      'vue/no-v-text': 'error',
      'vue/padding-line-between-blocks': 'error',
      'vue/prefer-separate-static-class': 'error',
      'vue/prefer-true-attribute-shorthand': 'error',

      // JSX in Vue (if using)
      'vue/jsx-uses-vars': 'error',
    },
  },

  {
    name: 'vue/tsx',
    files: ['**/*.tsx'],
    rules: {
      // Relaxed rules for TSX files
      'react/prop-types': 'off',
    },
  },
]
