/**
 * @baicie/eslint-config - NestJS ESLint Configuration
 *
 * Extends the base configuration with NestJS-specific rules and plugins.
 * Use this for NestJS backend projects.
 */
import base from './base.js'
import pluginImport from 'eslint-plugin-import'

const micromatch = {
  name: 'nestjs/micromatch',
  files: ['**/*.module.ts', '**/*.controller.ts', '**/*.service.ts'],
  rules: {
    // NestJS naming conventions
    '@typescript-eslint/class-naming-convention': [
      'error',
      {
        selector: 'class',
        format: ['PascalCase'],
        suffix: [
          'Controller',
          'Service',
          'Module',
          'Middleware',
          'Guard',
          'Pipe',
          'Interceptor',
          'Decorator',
          'ExceptionFilter',
        ],
      },
    ],
  },
}

const dtoRules = {
  name: 'nestjs/dto',
  files: ['**/*.dto.ts', '**/*.entity.ts', '**/*.interface.ts'],
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'property',
        format: ['camelCase', 'snake_case'],
        leadingUnderscore: 'allow',
      },
    ],
  },
}

const decoratedClassRules = {
  name: 'nestjs/decorated-classes',
  files: ['**/*.controller.ts', '**/*.service.ts', '**/*.resolver.ts'],
  rules: {
    'class-methods-use-this': 'off',
  },
}

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,

  // NestJS-specific rules
  {
    plugins: {
      import: pluginImport,
    },
  },

  micromatch,
  dtoRules,
  decoratedClassRules,

  {
    rules: {
      // Allow dependency injection patterns
      'no-underscore-dangle': [
        'error',
        {
          allow: ['__', '_id'],
        },
      ],

      // Allow parameter decorators
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // NestJS controller/service naming
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase'],
        },
      ],
    },
  },
]
