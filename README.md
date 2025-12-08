# @baicie/cli

一个现代化的项目脚手架工具，支持多种模板类型，提供快速创建项目的能力。

## 特性

- 🚀 **快速创建**: 支持多种项目模板快速创建
- 📦 **多包管理**: 支持 npm、yarn、pnpm、cnpm
- 🔄 **模板更新**: 自动检测模板更新，支持缓存机制
- 🌐 **多源支持**: 支持 GitHub、Gitee 和自定义模板源
- 🎯 **Git 集成**: 支持自动初始化 Git 仓库和关联远程仓库
- 📱 **多平台**: 支持前端、后端、移动端等多种项目类型

## 安装

### 全局安装

```bash
npm install -g @baicie/cli
# 或
yarn global add @baicie/cli
# 或
pnpm add -g @baicie/cli
```

## 使用方法

### 基本用法

```bash
# 创建新项目
baicie-create-app
# 或使用别名
bca
```

### 交互式创建

直接运行命令，CLI 会引导你完成项目创建：

```bash
baicie-create-app
```

### 支持的模板

#### 前端模板

- **Vue3**: 基于 Vue 3 + Vite 的现代化前端项目
- **Vite Project**: 轻量级 Vite 项目模板
- **Default**: 基础 HTML 项目模板

#### 后端模板

- **API Server**: 基于 NestJS 的完整后端服务
- **Node TypeScript**: Node.js + TypeScript 项目
- **Simple Node TS**: 简单的 Node.js TypeScript 项目

#### 移动端模板

- **Taro**: 基于 Taro 的跨平台移动应用

#### 扩展模板

- **Monorepo**: 多包管理项目结构
- **Micro Frontend**: 微前端架构项目
- **Plasmo**: 浏览器扩展开发模板

## 配置选项

### 模板源选择

CLI 支持多种模板源：

1. **Github（最新）**: 从 GitHub 获取最新模板
2. **Gitee（最快）**: 从 Gitee 获取模板（国内访问更快）
3. **CLI 内置默认模板**: 使用本地缓存模板
4. **自定义**: 输入自定义的 GitHub 仓库地址

### 包管理工具

支持以下包管理工具：

- npm
- yarn
- pnpm
- cnpm

### Git 集成

- 自动初始化 Git 仓库
- 支持关联远程仓库
- 自动提交初始代码

## 高级用法

### 指定包管理工具

```bash
# 使用 pnpm 作为包管理工具
baicie-create-app create my-project --npm pnpm
```

## 模板开发

### 模板结构

```
template-repo/
├── template1/
│   ├── package.json
│   ├── src/
│   └── ...
├── template2/
│   ├── package.json
│   ├── src/
│   └── ...
└── template_creator.js
```

## 缓存机制

CLI 使用智能缓存机制：

- **模板缓存**: 自动缓存下载的模板，避免重复下载
- **版本检测**: 自动检测模板更新，只在需要时重新下载
- **增量更新**: 支持增量更新，提高创建速度

## 故障排除

### 常见问题

1. **网络问题**: 如果 GitHub 访问慢，建议使用 Gitee 源
2. **权限问题**: 确保有写入目标目录的权限
3. **依赖安装失败**: 可以手动进入项目目录重新安装依赖

## 其他工具

- **@baicie/scripts**：内部脚本工具包，提供提交信息校验 `verifyCommit`，校验失败时输出提示并以非零状态退出。构建产物在 `packages/scripts/dist/`，直接导入 `verifyCommit()` 即可使用。
