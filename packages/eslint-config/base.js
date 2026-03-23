/**
 * @baicie/eslint-config - Base ESLint Configuration
 *
 * This is the foundational ESLint configuration that all other configs extend from.
 * Provides TypeScript support, import ordering, and common linting rules.
 */
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import-x'
import unusedImports from 'eslint-plugin-unused-imports'
import perfectionist from 'eslint-plugin-perfectionist'

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,

  {
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
      perfectionist: perfectionist,
    },

    // Disable project-based type checking by default
    // Consumers should configure parserOptions.project in their own config
    languageOptions: {
      parserOptions: {
        project: null,
        tsconfigRootDir: null,
      },
    },

    rules: {
      // Delete unused imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
        },
      ],

      // Import ordering
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      // Perfectionist for sorting
      'perfectionist/sort-objects': 'off',

      // Disable conflicting rules
      'no-unused-vars': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.git/**',
      '**/temp/**',
      '**/__tests__/**',
      '**/*.spec.ts',
      '**/*.test.ts',
    ],
  },
]
