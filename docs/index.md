---
layout: home

hero:
  name: 'baicie tools'
  text: '现代化工具链集合'
  tagline: 提供 CLI 脚手架、工具函数库、package.json 操作和发布工具
  actions:
    - theme: brand
      text: 开始使用
      link: /cli/getting-started
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/baicie/tools

features:
  - title: 🚀 @baicie/cli
    details: 一个现代化的项目脚手架工具，支持多种模板类型，提供快速创建项目的能力
  - title: 📦 @baicie/pkg
    details: 功能强大的 package.json 工具包，用于创建、格式化、验证和操作 package.json 文件
  - title: 🛠️ @baicie/tools
    details: 实用的 JavaScript/TypeScript 工具函数库，提供常用的工具方法，提高开发效率
  - title: 🔐 @baicie/storage
    details: 统一 localStorage / sessionStorage / Cookie / IndexedDB 的响应式数据代理
  - title: 🎯 @baicie/release
    details: 自动化发布工具，支持版本管理、变更日志生成和包发布
---

## 安装

### CLI 工具

```bash
npm install -g @baicie/cli
# 或
pnpm add -g @baicie/cli
```

### 工具库

```bash
npm install @baicie/tools @baicie/pkg
# 或
pnpm add @baicie/tools @baicie/pkg
```

### 存储代理

```bash
npm install @baicie/storage
# 或
pnpm add @baicie/storage
```

## 快速开始

### 创建项目

```bash
bca my-project
```

### 使用工具函数

```typescript
import { unique, debounce, formatDate } from '@baicie/tools'

// 数组去重
const arr = unique([1, 2, 2, 3, 3, 4])

// 防抖函数
const debouncedFn = debounce(() => {
  console.log('搜索...')
}, 300)

// 格式化日期
const date = formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')
```

### 操作 package.json

```typescript
import { createPackageJson, prettifyPackageJson } from '@baicie/pkg'

const pkg = createPackageJson({
  name: 'my-app',
  version: '1.0.0',
})

const formatted = prettifyPackageJson(pkg)
```

### 统一存储

```typescript
import {
  createStorageStore,
  createLocalStorageAdapter,
} from '@baicie/storage'

const store = createStorageStore(createLocalStorageAdapter())

store.subscribe('*', change => {
  console.info(change.key, change.type)
})
```

## 包说明

- **@baicie/cli** - 项目脚手架工具
- **@baicie/pkg** - package.json 操作工具
- **@baicie/storage** - 浏览器/内存统一存储代理
- **@baicie/tools** - 工具函数库
- **@baicie/release** - 发布工具
