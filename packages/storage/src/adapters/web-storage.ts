import type { StorageAdapter } from '../types'
import { WILDCARD_KEY } from '../types'
import { createMemoryAdapter } from './memory'

export interface WebStorageAdapterOptions {
  storage?: Storage
  windowRef?: Window
  id?: string
}

export function createLocalStorageAdapter(
  options?: WebStorageAdapterOptions,
): StorageAdapter {
  return createWebStorageAdapter('localStorage', 'local-storage', options)
}

export function createSessionStorageAdapter(
  options?: WebStorageAdapterOptions,
): StorageAdapter {
  return createWebStorageAdapter('sessionStorage', 'session-storage', options)
}

function createWebStorageAdapter(
  apiName: 'localStorage' | 'sessionStorage',
  defaultId: string,
  options?: WebStorageAdapterOptions,
): StorageAdapter {
  var resolvedOptions = options || {}
  var resolvedStorage = resolveStorage(apiName, resolvedOptions.storage)
  if (!resolvedStorage) {
    return createMemoryAdapter(defaultId + '-fallback')
  }

  var activeStorage = resolvedStorage
  var adapterId = resolvedOptions.id || defaultId
  var windowRef = resolveWindow(resolvedOptions.windowRef)

  function read(key: string) {
    try {
      var value = activeStorage.getItem(key)
      return Promise.resolve(value)
    } catch (_error) {
      return Promise.resolve(null)
    }
  }

  function write(key: string, value: string) {
    try {
      activeStorage.setItem(key, value)
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  function remove(key: string) {
    try {
      activeStorage.removeItem(key)
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  function clear() {
    try {
      activeStorage.clear()
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  function keys() {
    var result: string[] = []
    try {
      var index = 0
      while (index < activeStorage.length) {
        var key = activeStorage.key(index)
        if (typeof key === 'string') {
          result.push(key)
        }
        index += 1
      }
    } catch (_error) {
      result = []
    }
    return Promise.resolve(result)
  }

  var adapter: StorageAdapter = {
    id: adapterId,
    read: read,
    write: write,
    remove: remove,
    clear: clear,
    keys: keys,
  }

  if (windowRef) {
    var targetWindow = windowRef
    adapter.listen = function (subscriber) {
      function handleStorage(event: StorageEvent) {
        if (event.storageArea !== activeStorage) {
          return
        }
        if (typeof event.key === 'string') {
          subscriber({
            key: event.key,
            value: event.newValue,
            type: event.newValue === null ? 'remove' : 'write',
            source: adapterId,
          })
          return
        }
        subscriber({
          key: WILDCARD_KEY,
          value: null,
          type: 'clear',
          source: adapterId,
        })
      }
      targetWindow.addEventListener('storage', handleStorage)
      return function () {
        targetWindow.removeEventListener('storage', handleStorage)
      }
    }
  }

  return adapter
}

function resolveWindow(windowRef?: Window) {
  if (windowRef) {
    return windowRef
  }
  var globalWindow = getGlobalWindow()
  if (globalWindow && typeof globalWindow.addEventListener === 'function') {
    return globalWindow
  }
  return undefined
}

function resolveStorage(
  apiName: 'localStorage' | 'sessionStorage',
  provided?: Storage,
) {
  if (provided) {
    return provided
  }
  var globalWindow = getGlobalWindow()
  if (!globalWindow) {
    return undefined
  }
  try {
    var candidate = (
      globalWindow as unknown as Record<string, Storage | undefined>
    )[apiName]
    return candidate
  } catch (_error) {
    return undefined
  }
}

function getGlobalWindow() {
  if (typeof globalThis !== 'undefined') {
    return globalThis as unknown as Window
  }
  return undefined
}
