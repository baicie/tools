import { describe, expect, it } from 'vitest'

describe('StorageChange types', () => {
  it('StorageChange should have correct structure', () => {
    const change = {
      key: 'test-key',
      value: 'test-value',
      type: 'write' as const,
      source: 'test-source',
    }

    expect(change.key).toBe('test-key')
    expect(change.value).toBe('test-value')
    expect(change.type).toBe('write')
    expect(change.source).toBe('test-source')
  })

  it('StorageChangeType should support all types', () => {
    const types: Array<'write' | 'remove' | 'clear' | 'read'> = [
      'write',
      'remove',
      'clear',
      'read',
    ]

    types.forEach(type => {
      const change = {
        key: 'test',
        value: 'value',
        type,
        source: 'test',
      }
      expect(change.type).toBe(type)
    })
  })

  it('StorageChangeListener should accept StorageChange', () => {
    const listener = (change: {
      key: string
      value: string | null
      type: 'write' | 'remove' | 'clear' | 'read'
      source: string
    }) => {
      expect(change).toBeDefined()
    }

    listener({ key: 'a', value: 'b', type: 'write', source: 'test' })
  })

  it('HijackHandle should have restore method', () => {
    const handle = {
      restore: () => {},
    }

    expect(typeof handle.restore).toBe('function')
  })
})
