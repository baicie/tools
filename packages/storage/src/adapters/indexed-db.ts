import type { StorageAdapter } from '../types'
import { createMemoryAdapter } from './memory'

export interface IndexedDBAdapterOptions {
  databaseName?: string
  storeName?: string
  version?: number
}

export function createIndexedDBAdapter(
  options?: IndexedDBAdapterOptions,
): StorageAdapter {
  var resolvedOptions = options || {}
  var dbName = resolvedOptions.databaseName || 'baicie-storage'
  var storeName = resolvedOptions.storeName || 'kv-store'
  var version = resolvedOptions.version || 1
  var dbFactory = resolveIndexedDB()

  if (!dbFactory) {
    return createMemoryAdapter('indexeddb-fallback')
  }

  var shouldFallback = false
  var fallbackAdapter: StorageAdapter | undefined
  var databasePromise = openDatabase(
    dbFactory,
    dbName,
    storeName,
    version,
  ).catch(function () {
    shouldFallback = true
    return undefined
  })

  function ensureFallback() {
    if (!fallbackAdapter) {
      fallbackAdapter = createMemoryAdapter('indexeddb-fallback')
    }
    return fallbackAdapter
  }

  function runWithDatabase<T>(
    executor: (database: IDBDatabase) => Promise<T>,
    fallbackExecutor: () => Promise<T>,
  ) {
    if (shouldFallback) {
      return fallbackExecutor()
    }
    return databasePromise
      .then(function (database) {
        if (!database) {
          shouldFallback = true
          return fallbackExecutor()
        }
        return executor(database)
      })
      .catch(function () {
        shouldFallback = true
        return fallbackExecutor()
      })
  }

  function read(key: string) {
    return runWithDatabase(
      function (database) {
        return new Promise<string | null>(function (resolve, reject) {
          try {
            var transaction = database.transaction(storeName, 'readonly')
            var store = transaction.objectStore(storeName)
            var request = store.get(key)
            request.onsuccess = function () {
              var value = request.result
              if (typeof value === 'string') {
                resolve(value)
                return
              }
              if (value === undefined || value === null) {
                resolve(null)
                return
              }
              resolve(String(value))
            }
            request.onerror = function () {
              reject(request.error || new Error('IndexedDB get failed'))
            }
          } catch (error) {
            reject(error)
          }
        })
      },
      function () {
        return ensureFallback().read(key)
      },
    )
  }

  function write(key: string, value: string) {
    return runWithDatabase(
      function (database) {
        return new Promise<void>(function (resolve, reject) {
          try {
            var transaction = database.transaction(storeName, 'readwrite')
            var store = transaction.objectStore(storeName)
            var request = store.put(value, key)
            request.onsuccess = function () {
              resolve()
            }
            request.onerror = function () {
              reject(request.error || new Error('IndexedDB put failed'))
            }
          } catch (error) {
            reject(error)
          }
        })
      },
      function () {
        return ensureFallback().write(key, value)
      },
    )
  }

  function remove(key: string) {
    return runWithDatabase(
      function (database) {
        return new Promise<void>(function (resolve, reject) {
          try {
            var transaction = database.transaction(storeName, 'readwrite')
            var store = transaction.objectStore(storeName)
            var request = store.delete(key)
            request.onsuccess = function () {
              resolve()
            }
            request.onerror = function () {
              reject(request.error || new Error('IndexedDB delete failed'))
            }
          } catch (error) {
            reject(error)
          }
        })
      },
      function () {
        return ensureFallback().remove(key)
      },
    )
  }

  function clear() {
    return runWithDatabase(
      function (database) {
        return new Promise<void>(function (resolve, reject) {
          try {
            var transaction = database.transaction(storeName, 'readwrite')
            var store = transaction.objectStore(storeName)
            var request = store.clear()
            request.onsuccess = function () {
              resolve()
            }
            request.onerror = function () {
              reject(request.error || new Error('IndexedDB clear failed'))
            }
          } catch (error) {
            reject(error)
          }
        })
      },
      function () {
        return ensureFallback().clear()
      },
    )
  }

  function keys() {
    return runWithDatabase(
      function (database) {
        return new Promise<string[]>(function (resolve, reject) {
          try {
            var transaction = database.transaction(storeName, 'readonly')
            var store = transaction.objectStore(storeName)
            var supportsGetAllKeys = typeof store.getAllKeys === 'function'
            if (supportsGetAllKeys) {
              var request = store.getAllKeys()
              request.onsuccess = function () {
                resolve(convertKeys(request.result))
              }
              request.onerror = function () {
                reject(
                  request.error || new Error('IndexedDB getAllKeys failed'),
                )
              }
              return
            }
            var cursorRequest = store.openKeyCursor()
            var collected: string[] = []
            cursorRequest.onsuccess = function () {
              var cursor = cursorRequest.result
              if (!cursor) {
                resolve(collected)
                return
              }
              collected.push(String(cursor.key))
              cursor.continue()
            }
            cursorRequest.onerror = function () {
              reject(
                cursorRequest.error || new Error('IndexedDB cursor failed'),
              )
            }
          } catch (error) {
            reject(error)
          }
        })
      },
      function () {
        return ensureFallback().keys()
      },
    )
  }

  return {
    id: 'indexeddb-storage',
    read,
    write,
    remove,
    clear,
    keys,
  }
}

function convertKeys(values: unknown) {
  if (!Array.isArray(values)) {
    return []
  }
  var result: string[] = []
  var index = 0
  while (index < values.length) {
    result.push(String(values[index]))
    index += 1
  }
  return result
}

function resolveIndexedDB() {
  if (typeof globalThis !== 'undefined' && globalThis.indexedDB) {
    return globalThis.indexedDB
  }
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB
  }
  return undefined
}

function openDatabase(
  factory: IDBFactory,
  name: string,
  storeName: string,
  version: number,
) {
  return new Promise<IDBDatabase>(function (resolve, reject) {
    try {
      var request = factory.open(name, version)
      request.onerror = function () {
        reject(request.error || new Error('IndexedDB open failed'))
      }
      request.onsuccess = function () {
        resolve(request.result)
      }
      request.onupgradeneeded = function () {
        var database = request.result
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName)
        }
      }
    } catch (error) {
      reject(error)
    }
  })
}
