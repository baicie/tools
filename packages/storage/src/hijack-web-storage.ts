import type { HijackHandle, StorageChangeListener } from './types'

export function hijackWebStorage(
  storage: Storage,
  adapterId: string,
  listener: StorageChangeListener,
): HijackHandle | undefined {
  try {
    var restoreSetItem = overrideMethod(
      storage,
      'setItem',
      function (original, args) {
        var key = args[0]
        var value = args[1]
        var result = original.call(storage, key, value)
        listener({
          key: key,
          value: storage.getItem(key),
          type: 'write',
          source: adapterId,
        })
        return result
      },
    )

    var restoreRemoveItem = overrideMethod(
      storage,
      'removeItem',
      function (original, args) {
        var key = args[0]
        var result = original.call(storage, key)
        listener({
          key: key,
          value: null,
          type: 'remove',
          source: adapterId,
        })
        return result
      },
    )

    var restoreClear = overrideMethod(storage, 'clear', function (original) {
      var keys = snapshotKeys(storage)
      var result = original.call(storage)
      var index = 0
      while (index < keys.length) {
        listener({
          key: keys[index],
          value: null,
          type: 'clear',
          source: adapterId,
        })
        index += 1
      }
      return result
    })

    return {
      restore: function () {
        restoreSetItem()
        restoreRemoveItem()
        restoreClear()
      },
    }
  } catch (_error) {
    return undefined
  }
}

type StorageMethodName = 'setItem' | 'removeItem' | 'clear'
type StorageMethod = (...args: unknown[]) => unknown
function overrideMethod(
  storage: Storage,
  methodName: StorageMethodName,
  handler: (original: StorageMethod, args: IArguments) => unknown,
) {
  var original = (storage as unknown as Record<string, StorageMethod>)[
    methodName
  ]
  if (typeof original !== 'function') {
    return function () {}
  }
  var wrapped = function () {
    return handler(original, arguments)
  }
  try {
    Object.defineProperty(storage, methodName, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: wrapped,
    })
  } catch (_error) {
    ;(storage as unknown as Record<string, StorageMethod>)[methodName] = wrapped
  }
  var restored = false
  return function restore() {
    if (restored) {
      return
    }
    restored = true
    try {
      Object.defineProperty(storage, methodName, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: original,
      })
    } catch (_error) {
      ;(storage as unknown as Record<string, StorageMethod>)[methodName] =
        original
    }
  }
}

function snapshotKeys(storage: Storage) {
  var keys: string[] = []
  try {
    var index = 0
    while (index < storage.length) {
      var key = storage.key(index)
      if (typeof key === 'string') {
        keys.push(key)
      }
      index += 1
    }
  } catch (_error) {
    keys = []
  }
  return keys
}
