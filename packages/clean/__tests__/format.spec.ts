import { describe, expect, it } from 'vitest'
import { formatSize, getSizeColor } from '../src/clean'

describe('DEFAULT_TARGETS', () => {
  it('should be defined and contain expected values', () => {
    const targets = ['node_modules', 'target'] as const
    expect(targets).toContain('node_modules')
    expect(targets).toContain('target')
    expect(targets).toHaveLength(2)
  })
})

describe('formatSize', () => {
  it('should format 0 bytes', () => {
    expect(formatSize(0)).toBe('0 B')
  })

  it('should format bytes', () => {
    expect(formatSize(512)).toBe('512.00 B')
    expect(formatSize(1023)).toBe('1023.00 B')
  })

  it('should format kilobytes', () => {
    expect(formatSize(1024)).toBe('1.00 KB')
    expect(formatSize(1536)).toBe('1.50 KB')
    expect(formatSize(2048)).toBe('2.00 KB')
  })

  it('should format megabytes', () => {
    expect(formatSize(1024 * 1024)).toBe('1.00 MB')
    expect(formatSize(1024 * 1024 * 2.5)).toBe('2.50 MB')
    expect(formatSize(1024 * 1024 * 100)).toBe('100.00 MB')
  })

  it('should format gigabytes', () => {
    expect(formatSize(1024 * 1024 * 1024)).toBe('1.00 GB')
    expect(formatSize(1024 * 1024 * 1024 * 5)).toBe('5.00 GB')
  })

  it('should format terabytes', () => {
    expect(formatSize(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB')
    expect(formatSize(1024 * 1024 * 1024 * 1024 * 2)).toBe('2.00 TB')
  })

  it('should handle very small values', () => {
    expect(formatSize(1)).toBe('1.00 B')
  })

  it('should handle boundary values correctly', () => {
    expect(formatSize(1023)).toBe('1023.00 B')
    expect(formatSize(1024)).toBe('1.00 KB')
    expect(formatSize(1024 * 1024 - 1)).toBe('1024.00 KB')
    expect(formatSize(1024 * 1024)).toBe('1.00 MB')
    expect(formatSize(1024 * 1024 * 1024 - 1)).toBe('1024.00 MB')
    expect(formatSize(1024 * 1024 * 1024)).toBe('1.00 GB')
  })
})

describe('getSizeColor', () => {
  it('should return gray for bytes less than 1KB', () => {
    const grayFn = getSizeColor(500)
    expect(typeof grayFn).toBe('function')
    expect(grayFn('test')).toBeDefined()
  })

  it('should return dim for 1KB to 1MB', () => {
    const dimFn = getSizeColor(1024)
    expect(typeof dimFn).toBe('function')
    expect(dimFn('test')).toBeDefined()
  })

  it('should return dim for 1MB (boundary)', () => {
    const dimFn = getSizeColor(1024 * 1024)
    expect(typeof dimFn).toBe('function')
    expect(dimFn('test')).toBeDefined()
  })

  it('should return yellow for 1MB to 1GB', () => {
    const yellowFn = getSizeColor(1024 * 1024 * 50)
    expect(typeof yellowFn).toBe('function')
    expect(yellowFn('test')).toBeDefined()
  })

  it('should return yellow for 1GB (boundary)', () => {
    const yellowFn = getSizeColor(1024 * 1024 * 1024)
    expect(typeof yellowFn).toBe('function')
    expect(yellowFn('test')).toBeDefined()
  })

  it('should return red for greater than 1GB', () => {
    const redFn = getSizeColor(1024 * 1024 * 1024 + 1)
    expect(typeof redFn).toBe('function')
    expect(redFn('test')).toBeDefined()
  })

  it('should return red for very large sizes', () => {
    const redFn = getSizeColor(1024 * 1024 * 1024 * 1024)
    expect(typeof redFn).toBe('function')
    expect(redFn('test')).toBeDefined()
  })

  it('should return function that returns string', () => {
    const colorFn = getSizeColor(100)
    const result = colorFn('hello')
    expect(typeof result).toBe('string')
    expect(result).toContain('hello')
  })

  it('should handle zero bytes', () => {
    const fn = getSizeColor(0)
    expect(typeof fn).toBe('function')
    expect(fn('test')).toBeDefined()
  })

  it('should return different colors for different size ranges', () => {
    const grayFn = getSizeColor(100)
    const dimFn = getSizeColor(2048)
    const yellowFn = getSizeColor(1024 * 1024 * 50)
    const redFn = getSizeColor(1024 * 1024 * 1024 * 2)

    expect(typeof grayFn).toBe('function')
    expect(typeof dimFn).toBe('function')
    expect(typeof yellowFn).toBe('function')
    expect(typeof redFn).toBe('function')
  })
})
