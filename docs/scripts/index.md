# @baicie/scripts

内部脚本工具包，当前提供提交信息校验函数，可集成到 Git hooks 或 CI 流程。

## 安装

```bash
pnpm add @baicie/scripts
```

## 快速使用

```ts
import { verifyCommit } from '@baicie/scripts'

// 默认读取 .git/COMMIT_EDITMSG
verifyCommit()

// 或指定提交信息文件路径
verifyCommit('/tmp/commit-msg.txt')
```

校验失败会打印错误提示并以非零状态退出，适合在 `commit-msg` hook 中使用。

## 集成示例（Husky）

```bash
npx husky add .husky/commit-msg "pnpm exec tsx scripts/verify-commit.ts"
```

`verifyCommit` 会检查是否符合 Conventional Commits 规则（如 `feat(xxx): message`），并提供示例格式提示。

## 构建产物

- ESM：`dist/index.js`
- CJS：`dist/index.cjs`
- 类型声明：`dist/index.d.ts`

## 相关命令

```bash
pnpm --filter @baicie/scripts build      # 生成 dist
pnpm --filter @baicie/scripts typecheck  # 类型检查
```

