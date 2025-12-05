import type { HijackHandle, StorageChangeListener } from './types'

export function hijackWebStorage(
  storage: Storage,
  adapterId: string,
  listener: StorageChangeListener,
): HijackHandle {
  const proto = Object.getPrototypeOf(storage)

  const original = {
    setItem: proto.setItem,
    removeItem: proto.removeItem,
    clear: proto.clear,
  }

  proto.setItem = new Proxy(original.setItem, {
    apply(target, thisArg, args: any[]) {
      const [key, value] = args
      const res = Reflect.apply(target, thisArg, args)

      if (thisArg === storage) {
        listener({ key, value, type: 'write', source: adapterId })
      }
      return res
    },
  })

  proto.removeItem = new Proxy(original.removeItem, {
    apply(target, thisArg, args: any[]) {
      const [key] = args
      const res = Reflect.apply(target, thisArg, args)
      if (thisArg === storage) {
        listener({ key, value: null, type: 'remove', source: adapterId })
      }
      return res
    },
  })

  proto.clear = new Proxy(original.clear, {
    apply(target, thisArg) {
      const keys = snapshotKeys(storage)
      const res = Reflect.apply(target, thisArg, [])

      if (thisArg === storage) {
        keys.forEach(k =>
          listener({ key: k, value: null, type: 'clear', source: adapterId }),
        )
      }
      return res
    },
  })

  return {
    restore() {
      proto.setItem = original.setItem
      proto.removeItem = original.removeItem
      proto.clear = original.clear
    },
  }
}

function snapshotKeys(storage: Storage) {
  const out: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (typeof key === 'string') out.push(key)
  }
  return out
}
