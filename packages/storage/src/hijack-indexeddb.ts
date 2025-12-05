import type { HijackHandle, StorageChangeListener } from './types'

/**
 * 劫持 IndexedDB 来监听变化
 */
export function hijackIndexedDB(
  indexedDBRef: IDBFactory,
  adapterId: string,
  listener: StorageChangeListener,
): HijackHandle | undefined {
  try {
    if (!indexedDBRef || typeof indexedDBRef.open !== 'function') {
      return undefined
    }

    // 保存原始的 open 方法
    const originalOpen = indexedDBRef.open

    // 劫持 open 方法
    const hijackedOpen = function (
      name: string,
      version?: number,
    ): IDBOpenDBRequest {
      const request = originalOpen.call(indexedDBRef, name, version)
      const dbName = name

      // 监听成功打开数据库
      request.addEventListener(
        'success',
        function () {
          const db = request.result
          if (!db) {
            return
          }

          // 劫持数据库的 transaction 方法
          hijackDatabaseTransactions(db, dbName, adapterId, listener)
        },
        { once: true },
      )

      return request
    }

    // 替换 open 方法
    try {
      Object.defineProperty(indexedDBRef, 'open', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: hijackedOpen,
      })
    } catch (_error) {
      ;(indexedDBRef as any).open = hijackedOpen
    }

    // 返回恢复函数
    return {
      restore: function () {
        try {
          Object.defineProperty(indexedDBRef, 'open', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: originalOpen,
          })
        } catch (_error) {
          ;(indexedDBRef as any).open = originalOpen
        }
      },
    }
  } catch (_error) {
    return undefined
  }
}

/**
 * 劫持数据库的事务方法
 */
function hijackDatabaseTransactions(
  db: IDBDatabase,
  dbName: string,
  adapterId: string,
  listener: StorageChangeListener,
): void {
  try {
    const originalTransaction = db.transaction

    const hijackedTransaction = function (
      storeNames: string | string[],
      mode?: IDBTransactionMode,
    ): IDBTransaction {
      const transaction = originalTransaction.call(db, storeNames, mode)
      const storeNameList =
        typeof storeNames === 'string' ? [storeNames] : storeNames

      // 劫持事务中的每个 object store
      for (let i = 0; i < storeNameList.length; i += 1) {
        const storeName = storeNameList[i]
        try {
          const store = transaction.objectStore(storeName)
          if (store) {
            hijackObjectStore(store, dbName, storeName, adapterId, listener)
          }
        } catch (_error) {
          // 忽略错误
        }
      }

      return transaction
    }

    try {
      Object.defineProperty(db, 'transaction', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: hijackedTransaction,
      })
    } catch (_error) {
      ;(db as any).transaction = hijackedTransaction
    }
  } catch (_error) {
    // 忽略错误
  }
}

/**
 * 劫持 ObjectStore 的方法
 */
function hijackObjectStore(
  store: IDBObjectStore,
  dbName: string,
  storeName: string,
  adapterId: string,
  listener: StorageChangeListener,
): void {
  try {
    // 劫持 put 方法
    if (typeof store.put === 'function') {
      const originalPut = store.put
      const hijackedPut = function (value: any, key?: IDBValidKey): IDBRequest {
        const request = originalPut.call(store, value, key)
        const actualKey = key !== undefined ? String(key) : request.result

        request.addEventListener(
          'success',
          function () {
            listener({
              key: `${dbName}.${storeName}.${actualKey}`,
              value: JSON.stringify(value),
              type: 'write',
              source: adapterId,
            })
          },
          { once: true },
        )

        return request
      }

      try {
        Object.defineProperty(store, 'put', {
          configurable: true,
          enumerable: false,
          writable: true,
          value: hijackedPut,
        })
      } catch (_error) {
        ;(store as any).put = hijackedPut
      }
    }

    // 劫持 add 方法
    if (typeof store.add === 'function') {
      const originalAdd = store.add
      const hijackedAdd = function (value: any, key?: IDBValidKey): IDBRequest {
        const request = originalAdd.call(store, value, key)
        const actualKey = key !== undefined ? String(key) : request.result

        request.addEventListener(
          'success',
          function () {
            listener({
              key: `${dbName}.${storeName}.${actualKey}`,
              value: JSON.stringify(value),
              type: 'write',
              source: adapterId,
            })
          },
          { once: true },
        )

        return request
      }

      try {
        Object.defineProperty(store, 'add', {
          configurable: true,
          enumerable: false,
          writable: true,
          value: hijackedAdd,
        })
      } catch (_error) {
        ;(store as any).add = hijackedAdd
      }
    }

    // 劫持 delete 方法
    if (typeof store.delete === 'function') {
      const originalDelete = store.delete
      const hijackedDelete = function (
        key: IDBValidKey | IDBKeyRange,
      ): IDBRequest {
        const request = originalDelete.call(store, key)
        const keyString = key instanceof IDBKeyRange ? 'range' : String(key)

        request.addEventListener(
          'success',
          function () {
            listener({
              key: `${dbName}.${storeName}.${keyString}`,
              value: null,
              type: 'remove',
              source: adapterId,
            })
          },
          { once: true },
        )

        return request
      }

      try {
        Object.defineProperty(store, 'delete', {
          configurable: true,
          enumerable: false,
          writable: true,
          value: hijackedDelete,
        })
      } catch (_error) {
        ;(store as any).delete = hijackedDelete
      }
    }

    // 劫持 clear 方法
    if (typeof store.clear === 'function') {
      const originalClear = store.clear
      const hijackedClear = function (): IDBRequest {
        const request = originalClear.call(store)

        request.addEventListener(
          'success',
          function () {
            listener({
              key: `${dbName}.${storeName}`,
              value: null,
              type: 'clear',
              source: adapterId,
            })
          },
          { once: true },
        )

        return request
      }

      try {
        Object.defineProperty(store, 'clear', {
          configurable: true,
          enumerable: false,
          writable: true,
          value: hijackedClear,
        })
      } catch (_error) {
        ;(store as any).clear = hijackedClear
      }
    }
  } catch (_error) {
    // 忽略错误
  }
}
