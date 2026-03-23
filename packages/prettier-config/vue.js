/**
 * @baicie/prettier-config - Vue Prettier Configuration
 *
 * Specialized Prettier configuration for Vue.js projects.
 * Extends the base configuration with Vue-specific overrides.
 */
import baseConfig from './index.js'

export default {
  ...baseConfig,

  // Vue-specific: Use html whitespace sensitivity
  htmlWhitespaceSensitivity: 'css',

  // Vue-specific: Vue template indentation handled by eslint-plugin-vue
  tabWidth: 2,
  useTabs: false,

  // Vue Single File Component order (handled by eslint, but Prettier respects it)
  // Note: Vue SFC <style> and <template> ordering is enforced by eslint-plugin-vue
  vueIndentScriptAndStyle: false,

  // HTML formatting for Vue templates
  htmlFormat: {
    wrapAttributes: 'force-aligned',
    endWithNewline: true,
    semi: true,
    singleQuote: true,
  },
}
