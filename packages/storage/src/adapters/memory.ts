import type { StorageAdapter } from '../types'

interface MemoryBucket {
  [key: string]: string
}

export function createMemoryAdapter(id?: string): StorageAdapter {
  var bucket: MemoryBucket = {}
  var adapterId = id || 'memory'

  function read(key: string) {
    if (Object.prototype.hasOwnProperty.call(bucket, key)) {
      return Promise.resolve(bucket[key])
    }
    return Promise.resolve(null)
  }

  function write(key: string, value: string) {
    bucket[key] = value
    return Promise.resolve()
  }

  function remove(key: string) {
    delete bucket[key]
    return Promise.resolve()
  }

  function clear() {
    bucket = {}
    return Promise.resolve()
  }

  function keys() {
    return Promise.resolve(Object.keys(bucket))
  }

  return {
    id: adapterId,
    read,
    write,
    remove,
    clear,
    keys,
  }
}
