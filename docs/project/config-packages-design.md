```markdown
# 多项目 ESLint / Prettier / TS 工具链通用优化方案

本方案目标：

- 多项目复用
- 统一规范
- 降低维护成本
- 支持 Monorepo / 多仓库
- 可扩展、可分层

---

# 一、核心思想（关键）

👉 **配置包化（Config as Package）**

不要在每个项目重复写配置，而是：
```

❌ 每个项目一套 eslint / prettier / tsconfig
✅ 抽成共享 npm 包统一维护

```

---

# 二、推荐工程结构

```

repo/
├── packages/
│ ├── eslint-config/ # ESLint 统一配置
│ ├── tsconfig/ # TypeScript 统一配置
│ ├── prettier-config/ # Prettier 统一配置
│
├── apps/
│ ├── web/
│ ├── admin/
│ └── mobile/
│
├── package.json
├── pnpm-workspace.yaml
└── turbo.json

````

---

# 三、Monorepo 基础工具

推荐组合：

- pnpm（workspace 支持）
- turbo（任务编排 + 缓存）

```bash
pnpm install
````

---

# 四、ESLint 统一方案（重点）

## 1. 使用 Flat Config（推荐）

不再使用 `.eslintrc`，而是：

```
eslint.config.js
```

---

## 2. 创建 ESLint 配置包

路径：

```
packages/eslint-config/
```

### package.json

```json
{
  "name": "@your-scope/eslint-config",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": "./base.js",
    "./react": "./react.js",
    "./node": "./node.js"
  }
}
```

---

## 3. base 配置（通用规则）

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
    },

    rules: {
      // 删除未使用 import
      'unused-imports/no-unused-imports': 'error',

      // TS 规则
      '@typescript-eslint/no-explicit-any': 'warn',

      // import 排序
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
        },
      ],
    },
  },
]
```

---

## 4. React 扩展配置

```js
import base from './base.js'
import react from 'eslint-plugin-react'
import hooks from 'eslint-plugin-react-hooks'

export default [
  ...base,
  {
    plugins: {
      react,
      'react-hooks': hooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
    },
  },
]
```

---

## 5. 项目中使用

```js
// apps/web/eslint.config.js
import config from '@your-scope/eslint-config/react'

export default config
```

---

# 五、Prettier 统一方案

## 1. 创建配置包

```
packages/prettier-config/
```

### index.js

```js
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
}
```

---

## 2. 项目中使用

```js
// prettier.config.js
export { default } from '@your-scope/prettier-config'
```

---

## 3. ESLint 兼容

安装：

```bash
pnpm add -D eslint-config-prettier
```

在 ESLint 配置中引入：

```js
import prettier from 'eslint-config-prettier'

export default [...base, prettier]
```

---

# 六、TypeScript 配置复用

## 1. base tsconfig

```
packages/tsconfig/base.json
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "moduleResolution": "Bundler",
    "skipLibCheck": true
  }
}
```

---

## 2. 项目继承

```json
{
  "extends": "@your-scope/tsconfig/base.json",
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

---

# 七、统一脚本管理

根目录：

```json
{
  "scripts": {
    "lint": "turbo run lint",
    "format": "prettier --write ."
  }
}
```

子项目：

```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

---

# 八、Git 提交阶段优化

使用：

```bash
pnpm add -D husky lint-staged
```

配置：

```json
{
  "lint-staged": {
    "*.{ts,tsx,js}": ["eslint --fix", "prettier --write"]
  }
}
```

---

# 九、进阶优化建议

## 1. 分层配置

将 ESLint 拆分：

```
eslint-config/
├── base.js
├── react.js
├── node.js
├── strict.js
```

不同项目按需使用：

```js
import config from '@your-scope/eslint-config/strict'
```

---

## 2. 统一依赖版本

将 ESLint / Prettier / TS 等：

- 放在 config 包 peerDependencies
- 由根项目统一管理版本

避免：

```
多个项目依赖版本不一致
```

---

## 3. CLI 初始化（可选增强）

可以做一个脚手架：

```bash
npx create-your-config
```

自动生成：

- eslint.config.js
- prettier.config.js
- tsconfig.json

---

# 十、总结

核心原则：

👉 **配置抽象成 npm 包**
👉 **按能力分层（base / react / node）**
👉 **Monorepo 统一管理**
👉 **所有项目只做“引用”，不做“定义”**

---

如果你下一步想继续优化，我可以帮你做一套更进阶的：

- 类似 `@antfu/eslint-config` 的“零配置 ESLint 体系”
- 或者“自动检测项目类型并加载对应规则”的 CLI 工具

```

```
