import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('hijackIndexedDB (jsdom)', () => {
  let logs: Array<{ type: string; key: string; value: string | null }>

  beforeEach(() => {
    logs = []
    vi.stubEnv('JSDOM_ENV', 'true')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should emit write event when putting data', async () => {
    if (typeof indexedDB === 'undefined') {
      return
    }

    const { hijackIndexedDB } = await import('../src/hijack-indexeddb')

    hijackIndexedDB(indexedDB, 'indexeddb', change => {
      logs.push({ type: change.type, key: change.key, value: change.value })
    })

    const dbName = 'test-db-' + Date.now()
    const request = indexedDB.open(dbName)

    await new Promise<void>(resolve => {
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('store', 'readwrite')
        const store = tx.objectStore('users')
        store.put({ name: 'John' }, 'user-1')

        tx.oncomplete = () => {
          db.close()
          indexedDB.deleteDatabase(dbName)
          resolve()
        }
      }
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    const writeLog = logs.find(
      (l: any) => l.type === 'write' && l.key.includes('users'),
    )
    expect(writeLog).toBeDefined()
  })

  it('should emit write event when adding data', async () => {
    if (typeof indexedDB === 'undefined') {
      return
    }

    const { hijackIndexedDB } = await import('../src/hijack-indexeddb')

    hijackIndexedDB(indexedDB, 'indexeddb', change => {
      logs.push({ type: change.type, key: change.key, value: change.value })
    })

    const dbName = 'test-db-add-' + Date.now()
    const request = indexedDB.open(dbName)

    await new Promise<void>(resolve => {
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('store', 'readwrite')
        const store = tx.objectStore('posts')
        store.add({ title: 'Hello' }, 'post-1')

        tx.oncomplete = () => {
          db.close()
          indexedDB.deleteDatabase(dbName)
          resolve()
        }
      }
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    const writeLog = logs.find(
      (l: any) => l.type === 'write' && l.key.includes('posts'),
    )
    expect(writeLog).toBeDefined()
  })

  it('should emit remove event when deleting data', async () => {
    if (typeof indexedDB === 'undefined') {
      return
    }

    const { hijackIndexedDB } = await import('../src/hijack-indexeddb')

    hijackIndexedDB(indexedDB, 'indexeddb', change => {
      logs.push({ type: change.type, key: change.key, value: change.value })
    })

    const dbName = 'test-db-delete-' + Date.now()
    const request = indexedDB.open(dbName)

    await new Promise<void>(resolve => {
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('store', 'readwrite')
        const store = tx.objectStore('items')

        store.put({ value: 'test' }, 'item-key')
        tx.oncomplete = () => {
          const tx2 = db.transaction('store', 'readwrite')
          const store2 = tx2.objectStore('items')
          store2.delete('item-key')

          tx2.oncomplete = () => {
            db.close()
            indexedDB.deleteDatabase(dbName)
            resolve()
          }
        }
      }
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(logs.some((l: any) => l.type === 'remove')).toBe(true)
  })

  it('should emit clear event when clearing object store', async () => {
    if (typeof indexedDB === 'undefined') {
      return
    }

    const { hijackIndexedDB } = await import('../src/hijack-indexeddb')

    hijackIndexedDB(indexedDB, 'indexeddb', change => {
      logs.push({ type: change.type, key: change.key, value: change.value })
    })

    const dbName = 'test-db-clear-' + Date.now()
    const request = indexedDB.open(dbName)

    await new Promise<void>(resolve => {
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('store', 'readwrite')
        const store = tx.objectStore('cache')

        store.put({ data: 'test' }, 'key1')
        tx.oncomplete = () => {
          const tx2 = db.transaction('store', 'readwrite')
          const store2 = tx2.objectStore('cache')
          store2.clear()

          tx2.oncomplete = () => {
            db.close()
            indexedDB.deleteDatabase(dbName)
            resolve()
          }
        }
      }
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(logs.some((l: any) => l.type === 'clear')).toBe(true)
  })

  it('restore should recover original open method', async () => {
    if (typeof indexedDB === 'undefined') {
      return
    }

    const { hijackIndexedDB } = await import('../src/hijack-indexeddb')

    const handle = hijackIndexedDB(indexedDB, 'indexeddb', vi.fn())

    handle!.restore()

    expect(typeof indexedDB.open).toBe('function')
  })
})
