import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  startNativeHijack,
  stopNativeHijack,
  subscribeStorageChanges,
} from '../src/native-watcher'

class FakeStorage implements Storage {
  private store: Record<string, string> = {}

  get length(): number {
    return Object.keys(this.store).length
  }

  clear(): void {
    this.store = {}
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key)
      ? this.store[key]
      : null
  }

  key(index: number): string | null {
    var keys = Object.keys(this.store)
    return typeof keys[index] === 'string' ? keys[index] : null
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value)
  }
}

describe('native hijack', () => {
  beforeEach(() => {
    stopNativeHijack()
  })

  afterEach(() => {
    stopNativeHijack()
  })

  it('emits changes when native methods are called', () => {
    var fakeStorage = new FakeStorage()
    startNativeHijack({
      storages: [{ storage: fakeStorage, id: 'spec-storage' }],
      local: false,
      session: false,
    })

    var logs: string[] = []
    var unsubscribe = subscribeStorageChanges(function (change) {
      logs.push(change.type + ':' + (change.value || ''))
    })

    fakeStorage.setItem('token', '123')
    fakeStorage.getItem('token')
    fakeStorage.removeItem('token')

    unsubscribe()

    expect(logs).toEqual(['write:123', 'read:123', 'remove:'])
  })

  it('emits changes when cookie is accessed', () => {
    if (typeof window === 'undefined') {
      return
    }

    startNativeHijack({
      local: false,
      session: false,
      cookie: true,
    })

    var logs: string[] = []
    var unsubscribe = subscribeStorageChanges(function (change) {
      logs.push(change.type + ':' + (change.value || ''))
    })

    document.cookie = 'test=value'
    var cookieValue = document.cookie

    unsubscribe()

    expect(logs).toEqual(['write:value', 'read:' + cookieValue])
  })

  it('should emit clear event', () => {
    var fakeStorage = new FakeStorage()
    startNativeHijack({
      storages: [{ storage: fakeStorage, id: 'spec-storage' }],
      local: false,
      session: false,
    })

    var logs: string[] = []
    var unsubscribe = subscribeStorageChanges(function (change) {
      logs.push(change.type)
    })

    fakeStorage.setItem('a', '1')
    fakeStorage.setItem('b', '2')
    fakeStorage.clear()

    unsubscribe()

    expect(logs).toContain('write')
    expect(logs).toContain('clear')
  })

  it('should handle multiple storage instances', () => {
    var storage1 = new FakeStorage()
    var storage2 = new FakeStorage()

    startNativeHijack({
      storages: [
        { storage: storage1, id: 'storage-1' },
        { storage: storage2, id: 'storage-2' },
      ],
      local: false,
      session: false,
    })

    var sources: string[] = []
    var unsubscribe = subscribeStorageChanges(function (change) {
      sources.push(change.source)
    })

    storage1.setItem('a', '1')
    storage2.setItem('b', '2')

    unsubscribe()

    expect(sources).toContain('storage-1')
    expect(sources).toContain('storage-2')
  })

  it('should support filter by include option', () => {
    var fakeStorage = new FakeStorage()
    startNativeHijack({
      storages: [{ storage: fakeStorage, id: 'spec-storage' }],
      local: false,
      session: false,
    })

    var logs: string[] = []
    var unsubscribe = subscribeStorageChanges(
      function (change) {
        logs.push(change.type + ':' + change.key)
      },
      { include: [{ key: 'token' }] },
    )

    fakeStorage.setItem('token', '123')
    fakeStorage.setItem('other', '456')

    unsubscribe()

    expect(logs).toEqual(['write:token'])
  })
})
