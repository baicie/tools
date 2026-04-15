# @baicie/clean

清理工作区中的 `node_modules` 和 Rust `target` 目录。

## 安装

```bash
npm install -g @baicie/clean
```

## 命令行使用

```bash
# 清理当前目录
ba-clean

# 预览将要删除的内容
ba-clean --dry

# 指定目录
ba-clean -r /path/to/project

# 仅清理 node_modules
ba-clean --node-modules

# 仅清理 Rust target
ba-clean --target

# 显示详细进度
ba-clean -v
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `-r, --root <path>` | 要扫描的根目录（默认：当前目录） |
| `-v, --verbose` | 显示详细进度 |
| `-d, --dry` | 预览模式 - 仅显示将要删除的内容 |
| `--node-modules` | 仅清理 node_modules |
| `--target` | 仅清理 Rust target |
| `-h, --help` | 显示帮助信息 |

## API 使用

```typescript
import { clean, cleanNodeModules, cleanTarget } from '@baicie/clean'

// 清理所有目标
const result = await clean({ root: '/path/to/project' })

// 仅清理 node_modules
const result = await cleanNodeModules('/path/to/project', { dry: true })

// 仅清理 Rust target
const result = await cleanTarget('/path/to/project')
```

### 配置选项

```typescript
interface CleanOptions {
  /** 要清理的目标目录，默认当前目录 */
  root?: string
  /** 是否显示详细进度 */
  verbose?: boolean
  /** 预览模式 - 仅显示将要删除的内容 */
  dry?: boolean
  /** 要清理的目标：'node_modules'、'target' 或两者，默认两者 */
  targets?: Array<'node_modules' | 'target'>
}
```

### 返回结果

```typescript
interface CleanResult {
  /** 删除的目录总数 */
  count: number
  /** 恢复的总空间（字节） */
  spaceSaved: number
  /** 已删除的路径列表 */
  removed: string[]
}
```
