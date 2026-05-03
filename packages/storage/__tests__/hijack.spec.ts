import { describe, expect, it } from 'vitest'

describe('hijackCookie', () => {
  it('should return undefined for null document', async () => {
    const { hijackCookie } = await import('../src/hijack-cookie')
    const result = hijackCookie(null as any, 'cookie', vi.fn())
    expect(result).toBeUndefined()
  })

  it('should return undefined for document without cookie property', async () => {
    const { hijackCookie } = await import('../src/hijack-cookie')
    const fakeDocNoCookie = {} as any
    const result = hijackCookie(fakeDocNoCookie, 'cookie', vi.fn())
    expect(result).toBeUndefined()
  })

  it('should return undefined when cookie descriptor has no getter', async () => {
    const { hijackCookie } = await import('../src/hijack-cookie')
    const fakeDoc = {
      cookie: 'test=value',
    } as any
    Object.defineProperty(fakeDoc, 'cookie', {
      value: 'test=value',
    })
    const result = hijackCookie(fakeDoc, 'cookie', vi.fn())
    expect(result).toBeUndefined()
  })

  it('should return undefined when cookie descriptor has no setter', async () => {
    const { hijackCookie } = await import('../src/hijack-cookie')
    const fakeDoc = {} as any
    Object.defineProperty(fakeDoc, 'cookie', {
      get() {
        return 'test=value'
      },
    })
    const result = hijackCookie(fakeDoc, 'cookie', vi.fn())
    expect(result).toBeUndefined()
  })

  it('HijackHandle should have restore method when returned', async () => {
    const { hijackCookie } = await import('../src/hijack-cookie')
    const fakeDoc = {} as any
    Object.defineProperty(fakeDoc, 'cookie', {
      get() {
        return ''
      },
      set(val: string) {
        this._cookie = val
      },
    })

    let logs: any[] = []
    const handle = hijackCookie(fakeDoc, 'cookie', change => {
      logs.push(change)
    })

    if (handle) {
      expect(typeof handle.restore).toBe('function')
      handle.restore()
    }
  })
})

describe('hijackIndexedDB', () => {
  it('should return undefined for null indexedDB', async () => {
    const { hijackIndexedDB } = await import('../src/hijack-indexeddb')
    const result = hijackIndexedDB(null as any, 'idb', vi.fn())
    expect(result).toBeUndefined()
  })

  it('should return undefined for indexedDB without open method', async () => {
    const { hijackIndexedDB } = await import('../src/hijack-indexeddb')
    const fakeIDB = {} as any
    const result = hijackIndexedDB(fakeIDB, 'idb', vi.fn())
    expect(result).toBeUndefined()
  })

  it('should return HijackHandle with restore method', async () => {
    const { hijackIndexedDB } = await import('../src/hijack-indexeddb')
    const fakeIDB = {
      open: vi.fn(() => ({
        result: {},
        addEventListener: vi.fn(),
      })),
    } as any

    const handle = hijackIndexedDB(fakeIDB, 'idb', vi.fn())

    expect(handle).toBeDefined()
    expect(handle!.restore).toBeDefined()
  })

  it('restore should be callable', async () => {
    const { hijackIndexedDB } = await import('../src/hijack-indexeddb')
    const fakeIDB = {
      open: vi.fn(() => ({
        result: {},
        addEventListener: vi.fn(),
      })),
    } as any

    const handle = hijackIndexedDB(fakeIDB, 'idb', vi.fn())
    expect(() => handle!.restore()).not.toThrow()
  })
})
