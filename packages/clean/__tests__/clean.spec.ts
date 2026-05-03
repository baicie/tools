import { describe, expect, it } from 'vitest'
import { formatSize, getSizeColor } from '../src/clean'

describe('clean', () => {
  describe('formatSize', () => {
    it('应该格式化字节为 B', () => {
      expect(formatSize(0)).toBe('0 B')
      expect(formatSize(512)).toBe('512.00 B')
    })

    it('应该格式化字节为 KB', () => {
      expect(formatSize(1024)).toBe('1.00 KB')
      expect(formatSize(1536)).toBe('1.50 KB')
    })

    it('应该格式化字节为 MB', () => {
      expect(formatSize(1024 * 1024)).toBe('1.00 MB')
      expect(formatSize(1024 * 1024 * 2.5)).toBe('2.50 MB')
    })

    it('应该格式化字节为 GB', () => {
      expect(formatSize(1024 * 1024 * 1024)).toBe('1.00 GB')
    })

    it('应该格式化字节为 TB', () => {
      expect(formatSize(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB')
    })
  })

  describe('getSizeColor', () => {
    it('对于小于 1KB 的应该返回灰色函数', () => {
      const colorFn = getSizeColor(500)
      expect(colorFn('test')).toBeDefined()
      expect(typeof colorFn).toBe('function')
    })

    it('对于 1KB-1MB 的应该返回 dim 函数', () => {
      const colorFn = getSizeColor(1024 * 100)
      expect(colorFn('test')).toBeDefined()
    })

    it('对于 1MB-1GB 的应该返回黄色函数', () => {
      const colorFn = getSizeColor(1024 * 1024 * 50)
      expect(colorFn('test')).toBeDefined()
    })

    it('对于大于 1GB 的应该返回红色函数', () => {
      const colorFn = getSizeColor(1024 * 1024 * 1024 * 2)
      expect(colorFn('test')).toBeDefined()
    })
  })
})
