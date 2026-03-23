/**
 * @baicie/prettier-config - Prettier Configuration
 *
 * Unified Prettier configuration for the Baicie project ecosystem.
 * Provides consistent code formatting across all packages.
 */
export default {
  // Use single quotes for strings
  singleQuote: true,

  // Use semicolons at the end of statements
  semi: true,

  // Use trailing commas where valid
  trailingComma: 'all',

  // Maximum line length
  printWidth: 100,

  // Use spaces for indentation
  useTabs: false,

  // Indentation size (2 spaces)
  tabWidth: 2,

  // Line breaks for objects
  proseWrap: 'preserve',

  // Quote props only when necessary
  quoteProps: 'as-needed',

  // UseLf for line endings
  endOfLine: 'lf',

  // Arrow function parentheses
  arrowParens: 'always',

  // Bracket spacing
  bracketSpacing: true,

  // Bracket same line
  bracketSameLine: false,

  // HTML whitespace sensitivity
  htmlWhitespaceSensitivity: 'css',

  // JSX single quotes
  jsxSingleQuote: false,

  // Range formatting
  rangeStart: 0,
  rangeEnd: Infinity,

  // Require pragma
  requirePragma: false,

  // Insert pragma
  insertPragma: false,
}
