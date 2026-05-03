import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('hijackCookie (jsdom)', () => {
  beforeEach(() => {
    vi.stubEnv('JSDOM_ENV', 'true')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should emit write event when setting cookie', () => {
    if (typeof document === 'undefined') {
      return
    }

    const { hijackCookie } = require('../src/hijack-cookie')
    const logs: any[] = []

    const handle = hijackCookie(document, 'cookie', (change: any) => {
      logs.push(change)
    })

    expect(handle).toBeDefined()

    document.cookie = 'token=abc123'

    expect(logs.some((l: any) => l.type === 'write' && l.key === 'token')).toBe(
      true,
    )
  })

  it('should emit read event when getting cookie', () => {
    if (typeof document === 'undefined') {
      return
    }

    const { hijackCookie } = require('../src/hijack-cookie')
    const logs: any[] = []

    hijackCookie(document, 'cookie', (change: any) => {
      logs.push(change)
    })

    document.cookie = 'token=abc123'
    // trigger read event by accessing cookie
    void document.cookie

    expect(logs.some((l: any) => l.type === 'read')).toBe(true)
  })

  it('should emit remove event when deleting cookie', () => {
    if (typeof document === 'undefined') {
      return
    }

    const { hijackCookie } = require('../src/hijack-cookie')
    const logs: any[] = []

    hijackCookie(document, 'cookie', (change: any) => {
      logs.push(change)
    })

    document.cookie = 'token=abc123'
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT'

    expect(
      logs.some((l: any) => l.type === 'remove' && l.key === 'token'),
    ).toBe(true)
  })

  it('restore should recover original cookie behavior', () => {
    if (typeof document === 'undefined') {
      return
    }

    const { hijackCookie } = require('../src/hijack-cookie')
    const handle = hijackCookie(document, 'cookie', vi.fn())

    expect(handle).toBeDefined()

    document.cookie = 'test=value'
    handle!.restore()

    document.cookie = 'new=value'
    expect(document.cookie).toContain('new=value')
  })
})
