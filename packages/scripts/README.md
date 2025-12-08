## @baicie/scripts

面向内部脚本的工具包，当前提供提交信息校验函数。

### 安装与构建

- 安装依赖：`pnpm install`
- 构建：`pnpm --filter @baicie/scripts build`
- 类型检查：`pnpm --filter @baicie/scripts typecheck`

构建产物输出到 `dist/`，包含：

- ESM：`dist/index.js`
- CJS：`dist/index.cjs`
- 类型声明：`dist/index.d.ts`

### API

#### `verifyCommit(msgPath?: string): void`

读取并校验提交信息，校验失败时打印错误提示并以非零状态退出。

- `msgPath`：可选，提交信息文件路径，默认 `.git/COMMIT_EDITMSG`。

示例：

```ts
import { verifyCommit } from '@baicie/scripts'

verifyCommit()
```

### 开发说明

- 打包配置：`rolldown.config.ts` 使用单入口 `src/index.ts`，同时生成 ESM/CJS 与声明文件。
- 仅依赖 `picocolors`（已标记为 external）。内置 Node 模块不打包。
