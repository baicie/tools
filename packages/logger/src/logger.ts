/* eslint-disable no-console */

/**
 * 日志工具模块
 * 提供统一的日志记录功能，支持代码索引和日志级别
 * 兼容 SSR 环境
 */

import pc from 'picocolors'
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
  debug: (codeOrMessage: LogCode | string, ...args: unknown[]) => void
  /**
   * 信息日志
   */
  info: (codeOrMessage: LogCode | string, ...args: unknown[]) => void
  /**
   * 警告日志
   */
  warn: (codeOrMessage: LogCode | string, ...args: unknown[]) => void
  /**
   * 错误日志
   */
  error: (codeOrMessage: LogCode | string, ...args: unknown[]) => void
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
 * 根据日志级别为消息增加颜色
 */
function colorizeMessage(level: LogLevel, message: string): string {
  if (level === 'debug') {
    return pc.gray(message)
  }
  if (level === 'info') {
    return pc.blue(message)
  }
  if (level === 'warn') {
    return pc.yellow(message)
  }
  if (level === 'error') {
    return pc.red(message)
  }
  return message
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

  const message = parts.join(' ')
  return colorizeMessage(level, message)
}

/**
 * 安全输出日志
 */
function safeConsoleLog(
  level: LogLevel,
  message: string,
  ...args: unknown[]
): void {
  const win = getWindow()

  if (!isBrowser() || !win) {
    // SSR 环境，使用 Node.js console
    const consoleMethod = console[level] || console.log
    consoleMethod(message, ...args)
    return
  }

  // 浏览器环境
  try {
    const consoleObj = (win as any).console
    if (consoleObj) {
      const consoleMethod = consoleObj[level] || consoleObj.log
      consoleMethod(message, ...args)
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
    debug(codeOrMessage: LogCode | string, ...args: unknown[]): void {
      if (!shouldLog('debug')) {
        return
      }
      const message = formatMessage('debug', codeOrMessage)
      safeConsoleLog('debug', message, ...args)
    },

    info(codeOrMessage: LogCode | string, ...args: unknown[]): void {
      if (!shouldLog('info')) {
        return
      }
      const message = formatMessage('info', codeOrMessage)
      safeConsoleLog('info', message, ...args)
    },

    warn(codeOrMessage: LogCode | string, ...args: unknown[]): void {
      if (!shouldLog('warn')) {
        return
      }
      const message = formatMessage('warn', codeOrMessage)
      safeConsoleLog('warn', message, ...args)
    },

    error(codeOrMessage: LogCode | string, ...args: unknown[]): void {
      if (!shouldLog('error')) {
        return
      }
      const message = formatMessage('error', codeOrMessage)
      safeConsoleLog('error', message, ...args)
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

export function debug(message: string, ...args: unknown[]): void {
  logger.debug(message, ...args)
}

export function info(message: string, ...args: unknown[]): void {
  logger.info(message, ...args)
}

export function warn(message: string, ...args: unknown[]): void {
  logger.warn(message, ...args)
}

export function error(message: string, ...args: unknown[]): void {
  logger.error(message, ...args)
}

/**
 * 初始化 Logger（通常在应用初始化时调用）
 */
export function initLogger(config: Partial<LoggerConfig>): void {
  logger.setConfig(config)
}
