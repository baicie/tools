import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Logger, createLoggerInstance } from '../src/logger'

describe('logger', () => {
  let logger: Logger

  beforeEach(() => {
    logger = createLoggerInstance({ enabled: true, level: 'debug' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createLoggerInstance', () => {
    it('应该创建 logger 实例', () => {
      const l = createLoggerInstance()
      expect(l).toBeDefined()
      expect(l.debug).toBeDefined()
      expect(l.info).toBeDefined()
      expect(l.warn).toBeDefined()
      expect(l.error).toBeDefined()
    })

    it('应该使用配置创建实例', () => {
      const l = createLoggerInstance({ enabled: true, level: 'error' })
      expect(l.getConfig().enabled).toBe(true)
      expect(l.getConfig().level).toBe('error')
    })
  })

  describe('setConfig/getConfig', () => {
    it('应该设置和获取配置', () => {
      logger.setConfig({ enabled: false, prefix: '[TEST]' })
      expect(logger.getConfig().enabled).toBe(false)
      expect(logger.getConfig().prefix).toBe('[TEST]')
    })

    it('应该合并部分配置', () => {
      logger.setConfig({ enabled: true })
      logger.setConfig({ prefix: '[APP]' })
      expect(logger.getConfig().enabled).toBe(true)
      expect(logger.getConfig().prefix).toBe('[APP]')
    })
  })

  describe('日志级别过滤', () => {
    it('debug 级别应该输出所有日志', () => {
      const testLogger = createLoggerInstance({
        enabled: true,
        level: 'debug',
        showLevel: false,
        showTimestamp: false,
      })
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

      testLogger.debug('debug msg')

      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy.mock.calls[0][0]).toContain('debug msg')
      consoleSpy.mockRestore()
    })

    it('error 级别应该只输出 error 日志', () => {
      const testLogger = createLoggerInstance({
        enabled: true,
        level: 'error',
        showLevel: false,
        showTimestamp: false,
      })
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      testLogger.debug('debug msg')
      testLogger.info('info msg')
      testLogger.warn('warn msg')
      testLogger.error('error msg')

      expect(debugSpy).not.toHaveBeenCalled()
      expect(warnSpy).not.toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalled()

      debugSpy.mockRestore()
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    })

    it('enabled 为 false 时不输出日志', () => {
      const testLogger = createLoggerInstance({ enabled: false })
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      testLogger.info('test')

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('force 为 true 时忽略 enabled 设置', () => {
      const testLogger = createLoggerInstance({ enabled: false, force: true })
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      testLogger.info('forced message')

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('日志格式', () => {
    it('应该显示时间戳', () => {
      const testLogger = createLoggerInstance({
        showTimestamp: true,
        showLevel: false,
        enabled: true,
      })
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      testLogger.info('timestamp test')

      expect(consoleSpy).toHaveBeenCalled()
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      consoleSpy.mockRestore()
    })

    it('应该显示前缀', () => {
      const testLogger = createLoggerInstance({
        prefix: '[MYAPP]',
        showLevel: false,
        showTimestamp: false,
        enabled: true,
      })
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      testLogger.info('prefix test')

      expect(consoleSpy).toHaveBeenCalled()
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('[MYAPP]')
      expect(output).toContain('prefix test')
      consoleSpy.mockRestore()
    })
  })

  describe('warn/error 函数', () => {
    it('warn 函数应该输出警告', () => {
      const testLogger = createLoggerInstance({
        enabled: true,
        level: 'debug',
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      testLogger.warn('warn message')

      expect(warnSpy).toHaveBeenCalled()
      expect(warnSpy.mock.calls[0][0]).toContain('warn message')
      warnSpy.mockRestore()
    })

    it('error 函数应该输出错误', () => {
      const testLogger = createLoggerInstance({
        enabled: true,
        level: 'debug',
      })
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      testLogger.error('error message')

      expect(errorSpy).toHaveBeenCalled()
      expect(errorSpy.mock.calls[0][0]).toContain('error message')
      errorSpy.mockRestore()
    })
  })

  describe('info 函数', () => {
    it('info 函数应该输出信息', () => {
      const testLogger = createLoggerInstance({
        enabled: true,
        level: 'debug',
        showLevel: false,
        showTimestamp: false,
      })
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      testLogger.info('info message')

      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy.mock.calls[0][0]).toContain('info message')
      consoleSpy.mockRestore()
    })
  })

  describe('额外参数', () => {
    it('应该传递额外参数', () => {
      const testLogger = createLoggerInstance({
        showLevel: false,
        showTimestamp: false,
        enabled: true,
      })
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      testLogger.info('message', { key: 'value' }, 123)

      expect(consoleSpy).toHaveBeenCalled()
      const args = consoleSpy.mock.calls[0]
      expect(args[1]).toEqual({ key: 'value' })
      expect(args[2]).toBe(123)
      consoleSpy.mockRestore()
    })
  })
})
