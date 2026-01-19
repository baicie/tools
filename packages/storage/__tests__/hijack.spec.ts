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
    // 跳过在非浏览器环境中的测试
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

    // 设置cookie
    document.cookie = 'test=value'
    // 读取cookie
    var cookieValue = document.cookie

    unsubscribe()

    expect(logs).toEqual(['write:value', 'read:' + cookieValue])
  })
})
