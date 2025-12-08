# @baicie/logger

通用日志工具模块，提供统一的日志记录功能，支持日志级别和配置。

## 特性

- 🎯 支持多种日志级别（debug、info、warn、error）
- ⚙️ 灵活的配置选项
- 🌐 兼容 SSR 环境
- 📦 轻量级，无外部依赖
- 🔧 TypeScript 支持

## 安装

```bash
pnpm add @baicie/logger
```

## 使用

### 基本使用

```typescript
import { logger, initLogger } from '@baicie/logger'

// 初始化配置
initLogger({
  enabled: true,
  level: 'debug',
  prefix: '[MyApp]',
  showTimestamp: true,
  showLevel: true,
})

// 使用日志
logger.debug('Debug message', { key: 'value' })
logger.info('Info message')
logger.warn('Warning message')
logger.error('Error message', new Error('Something went wrong'))

// 兼容旧版代码索引日志
logger.log('LOG_CODE_001')
```

### 便捷方法

```typescript
import { debug, info, warn, error, log } from '@baicie/logger'

debug('Debug message', { data: 'value' })
info('Info message')
warn('Warning message')
error('Error message')
log('LOG_CODE_001')
```

### 创建自定义 Logger 实例

```typescript
import { createLoggerInstance } from '@baicie/logger'

const customLogger = createLoggerInstance({
  enabled: true,
  level: 'warn',
  prefix: '[Custom]',
})

customLogger.warn('This is a warning')
```

### 动态配置

```typescript
import { logger } from '@baicie/logger'

// 获取当前配置
const config = logger.getConfig()

// 更新配置
logger.setConfig({
  enabled: true,
  level: 'error',
})
```

## API

### LoggerConfig

日志配置接口：

```typescript
interface LoggerConfig {
  enabled: boolean // 是否启用日志
  force?: boolean // 是否强制输出（忽略 enabled 设置）
  level?: LogLevel // 日志级别阈值
  showTimestamp?: boolean // 是否显示时间戳
  showLevel?: boolean // 是否显示日志级别标签
  prefix?: string // 日志前缀
}
```

### Logger

Logger 接口：

```typescript
interface Logger {
  debug(codeOrMessage: LogCode | string, data?: unknown): void
  info(codeOrMessage: LogCode | string, data?: unknown): void
  warn(codeOrMessage: LogCode | string, data?: unknown): void
  error(codeOrMessage: LogCode | string, data?: unknown): void
  log(code: LogCode, force?: boolean): void
  setConfig(config: Partial<LoggerConfig>): void
  getConfig(): LoggerConfig
}
```

### LogLevel

日志级别类型：

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error'
```

## 日志级别

日志级别按优先级从低到高：

1. `debug` - 调试信息
2. `info` - 一般信息
3. `warn` - 警告信息
4. `error` - 错误信息

只有大于等于配置的 `level` 的日志才会输出。

## 配置说明

- `enabled`: 控制是否启用日志输出，默认为 `false`
- `force`: 强制输出日志，即使 `enabled` 为 `false`，默认为 `false`
- `level`: 日志级别阈值，只有大于等于此级别的日志才会输出，默认为 `'info'`
- `showTimestamp`: 是否在日志消息前显示时间戳，默认为 `false`
- `showLevel`: 是否在日志消息前显示日志级别标签，默认为 `true`
- `prefix`: 日志消息前缀，默认为空字符串

## 环境支持

- 浏览器环境
- Node.js 环境（SSR）
- 编译目标：ES2016

## License

MIT
