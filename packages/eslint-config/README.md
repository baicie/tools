# @baicie/eslint-config

Unified ESLint configuration package for ESLint v9+ (flat config).

## Requirements

- ESLint v9+
- Node.js 18+

## Installation

```bash
pnpm add -D @baicie/eslint-config
```

## Usage

### Quick Start

**Base Configuration** - 适用于通用 TypeScript 项目：

```js
// eslint.config.js
import base from '@baicie/eslint-config'

export default base
```

### React 项目

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import base from '@baicie/eslint-config'
import react from '@baicie/eslint-config/react'

export default defineConfig([
  ...base,
  ...react,
])
```

### Node.js 项目

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import base from '@baicie/eslint-config'
import node from '@baicie/eslint-config/node'

export default defineConfig([
  ...base,
  ...node,
])
```

### NestJS 项目

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import base from '@baicie/eslint-config'
import nestjs from '@baicie/eslint-config/nestjs'

export default defineConfig([
  ...base,
  ...nestjs,
])
```

### Vue.js 项目

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import base from '@baicie/eslint-config'
import vue from '@baicie/eslint-config/vue'

export default defineConfig([
  ...base,
  ...vue,
])
```

### 严格模式

更严格的代码质量规则：

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import base from '@baicie/eslint-config'
import strict from '@baicie/eslint-config/strict'

export default defineConfig([
  ...base,
  ...strict,
])
```

### 组合使用

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import base from '@baicie/eslint-config'
import react from '@baicie/eslint-config/react'
import node from '@baicie/eslint-config/node'

export default defineConfig([
  ...base,
  ...node,
  ...react,
])
```

### 扩展/覆盖规则

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import base from '@baicie/eslint-config'

export default defineConfig([
  ...base,

  // 覆盖 base 中的规则
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
    },
  },

  // 针对特定文件的规则
  {
    files: ['scripts/**'],
    rules: {
      'no-console': 'off',
    },
  },
])
```

### 配置 TypeScript 项目路径

Base 配置默认关闭了 `parserOptions.project`。如需启用：

```js
// eslint.config.js
import { defineConfig } from 'eslint/config'
import base from '@baicie/eslint-config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig([
  {
    ...base.find(config => config.name === 'baicie/base'),
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
  },
])
```

## 内置功能

| 功能 | 说明 |
|------|------|
| TypeScript | 通过 `typescript-eslint` 支持 |
| Import 排序 | 按 groups 自动排序 |
| 未使用导入 | 自动检测并报错 |
| Perfectionist | 对象和导入排序 |
| Node.js 路径 | 支持 `node:` 前缀 |

## License

MIT
