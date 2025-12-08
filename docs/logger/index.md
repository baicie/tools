# @baicie/logger

轻量可配置的日志工具，支持浏览器与 Node 环境，可设置级别、前缀与时间戳。

## 安装

```bash
pnpm add @baicie/logger
```

## 快速开始

```ts
import { logger, initLogger } from '@baicie/logger'

initLogger({
  enabled: true,
  level: 'debug',
  prefix: '[MyApp]',
  showTimestamp: true,
  showLevel: true,
})

logger.info('启动完成')
logger.error('出现异常', new Error('Oops'))
```

## 便捷方法

```ts
import { debug, info, warn, error, log } from '@baicie/logger'

debug('调试信息', { foo: 1 })
info('普通信息')
warn('警告信息')
error('错误信息')
log('LOG_CODE_001')
```

## 自定义实例

```ts
import { createLoggerInstance } from '@baicie/logger'

const custom = createLoggerInstance({ enabled: true, level: 'warn', prefix: '[Custom]' })
custom.warn('仅输出 warn/error')
```

## 配置项（节选）

- `enabled`: 是否启用日志（默认 false）
- `level`: 日志级别阈值（`debug` | `info` | `warn` | `error`）
- `showTimestamp`: 是否显示时间戳
- `showLevel`: 是否显示级别标签
- `prefix`: 日志前缀

## 开发者命令

```bash
pnpm --filter @baicie/logger build      # 打包
pnpm --filter @baicie/logger typecheck  # 类型检查
```

