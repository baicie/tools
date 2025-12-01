/* eslint-disable no-console */

/**
 * 日志工具模块
 * 提供统一的日志记录功能，支持代码索引和日志级别
 * 兼容 SSR 环境
 */

import { getWindow, isBrowser } from './browser'
import { extend } from './general'

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * 日志代码索引类型
 */
export type LogCode = string

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  /**
   * 是否启用日志
   */
  enabled: boolean
  /**
   * 是否强制输出（忽略 enabled 设置）
   */
  force?: boolean
  /**
   * 日志级别阈值，低于此级别的日志不会输出
   */
  level?: LogLevel
  /**
   * 是否显示时间戳
   */
  showTimestamp?: boolean
  /**
   * 是否显示日志级别标签
   */
  showLevel?: boolean
  /**
   * 日志前缀
   */
  prefix?: string
}

/**
 * Logger 接口
 */
export interface Logger {
  /**
   * 调试日志
   */
  debug: (codeOrMessage: LogCode | string, data?: unknown) => void
  /**
   * 信息日志
   */
  info: (codeOrMessage: LogCode | string, data?: unknown) => void
  /**
   * 警告日志
   */
  warn: (codeOrMessage: LogCode | string, data?: unknown) => void
  /**
   * 错误日志
   */
  error: (codeOrMessage: LogCode | string, data?: unknown) => void
  /**
   * 兼容旧版代码索引日志（默认 info 级别）
   */
  log: (code: LogCode, force?: boolean) => void
  /**
   * 设置配置
   */
  setConfig: (config: Partial<LoggerConfig>) => void
  /**
   * 获取配置
   */
  getConfig: () => LoggerConfig
}

/**
 * 日志级别优先级映射
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: LoggerConfig = {
  enabled: false,
  force: false,
  level: 'info',
  showTimestamp: false,
  showLevel: true,
  prefix: '',
}

/**
 * 全局配置
 */
let globalConfig: LoggerConfig = extend({} as LoggerConfig, DEFAULT_CONFIG)

/**
 * 检查是否应该输出日志
 */
function shouldLog(level: LogLevel, force?: boolean): boolean {
  if (force || globalConfig.force) {
    return true
  }

  if (!globalConfig.enabled) {
    return false
  }

  const configLevel = globalConfig.level || 'info'
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configLevel]
}

/**
 * 格式化日志消息
 */
function formatMessage(
  level: LogLevel,
  codeOrMessage: LogCode | string,
): string {
  const parts: string[] = []

  if (globalConfig.prefix) {
    parts.push(globalConfig.prefix)
  }

  if (globalConfig.showTimestamp) {
    const timestamp = new Date().toISOString()
    parts.push(`[${timestamp}]`)
  }

  if (globalConfig.showLevel) {
    parts.push(`[${level.toUpperCase()}]`)
  }

  parts.push(codeOrMessage)

  return parts.join(' ')
}

/**
 * 安全输出日志
 */
function safeConsoleLog(
  level: LogLevel,
  message: string,
  data?: unknown,
): void {
  const win = getWindow()

  if (!isBrowser() || !win) {
    // SSR 环境，使用 Node.js console
    const consoleMethod = console[level] || console.log
    if (data !== undefined) {
      consoleMethod(message, data)
    } else {
      consoleMethod(message)
    }
    return
  }

  // 浏览器环境
  try {
    const consoleObj = (win as any).console
    if (consoleObj) {
      const consoleMethod = consoleObj[level] || consoleObj.log
      if (data !== undefined) {
        consoleMethod(message, data)
      } else {
        consoleMethod(message)
      }
    }
  } catch (_error) {
    // 忽略错误
  }
}

/**
 * 创建 Logger 实例
 */
function createLogger(config?: Partial<LoggerConfig>): Logger {
  if (config) {
    globalConfig = extend(globalConfig, config)
  }

  const logger: Logger = {
    debug(codeOrMessage: LogCode | string, data?: unknown): void {
      if (!shouldLog('debug')) {
        return
      }
      const message = formatMessage('debug', codeOrMessage)
      safeConsoleLog('debug', message, data)
    },

    info(codeOrMessage: LogCode | string, data?: unknown): void {
      if (!shouldLog('info')) {
        return
      }
      const message = formatMessage('info', codeOrMessage)
      safeConsoleLog('info', message, data)
    },

    warn(codeOrMessage: LogCode | string, data?: unknown): void {
      if (!shouldLog('warn')) {
        return
      }
      const message = formatMessage('warn', codeOrMessage)
      safeConsoleLog('warn', message, data)
    },

    error(codeOrMessage: LogCode | string, data?: unknown): void {
      if (!shouldLog('error')) {
        return
      }
      const message = formatMessage('error', codeOrMessage)
      safeConsoleLog('error', message, data)
    },

    log(code: LogCode, force?: boolean): void {
      // 兼容旧版代码索引日志方式
      if (!shouldLog('info', force)) {
        return
      }
      const message = formatMessage('info', code)
      safeConsoleLog('info', message)
    },

    setConfig(config: Partial<LoggerConfig>): void {
      globalConfig = extend(globalConfig, config)
    },

    getConfig(): LoggerConfig {
      return extend({} as LoggerConfig, globalConfig)
    },
  }

  return logger
}

/**
 * 默认 Logger 实例
 */
export const logger: Logger = createLogger()

/**
 * 创建新的 Logger 实例
 */
export function createLoggerInstance(config?: Partial<LoggerConfig>): Logger {
  return createLogger(config)
}

/**
 * 便捷方法：直接使用默认 logger
 */
export function log(code: LogCode, force?: boolean): void {
  logger.log(code, force)
}

export function debug(message: string, data?: unknown): void {
  logger.debug(message, data)
}

export function info(message: string, data?: unknown): void {
  logger.info(message, data)
}

export function warn(message: string, data?: unknown): void {
  logger.warn(message, data)
}

export function error(message: string, data?: unknown): void {
  logger.error(message, data)
}

/**
 * 初始化 Logger（通常在应用初始化时调用）
 */
export function initLogger(config: Partial<LoggerConfig>): void {
  logger.setConfig(config)
}
