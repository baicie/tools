import { createEmitter } from './emitter'
import { hijackCookie } from './hijack-cookie'
import { hijackIndexedDB } from './hijack-indexeddb'
import { hijackWebStorage } from './hijack-web-storage'
import type {
  HijackHandle,
  StorageChange,
  StorageChangeListener,
} from './types'

export interface NativeHijackOptions {
  windowRef?: Window
  local?: boolean
  session?: boolean
  cookie?: boolean
  indexedDB?: boolean
  storages?: Array<{ storage: Storage; id: string }>
}

const emitter = createEmitter()

let started = false
let handles: HijackHandle[] = []

export function subscribeStorageChanges(listener: StorageChangeListener) {
  ensureStarted()
  return emitter.subscribe(listener)
}

export function startNativeHijack(options?: NativeHijackOptions) {
  if (started) {
    return
  }
  const windowRef = resolveWindow(options?.windowRef)
  const attachments = options?.storages ? options.storages.slice() : []

  if (windowRef) {
    if (options?.local !== false && windowRef.localStorage) {
      attachments.push({ storage: windowRef.localStorage, id: 'local-storage' })
    }
    if (options?.session !== false && windowRef.sessionStorage) {
      attachments.push({
        storage: windowRef.sessionStorage,
        id: 'session-storage',
      })
    }

    // 劫持 Cookie
    if (options?.cookie !== false && windowRef.document) {
      const cookieHandle = hijackCookie(
        windowRef.document,
        'cookie',
        handleChange,
      )
      if (cookieHandle) {
        handles.push(cookieHandle)
      }
    }

    // 劫持 IndexedDB
    if (options?.indexedDB !== false && windowRef.indexedDB) {
      const indexedDBHandle = hijackIndexedDB(
        windowRef.indexedDB,
        'indexeddb',
        handleChange,
      )
      if (indexedDBHandle) {
        handles.push(indexedDBHandle)
      }
    }
  }

  let attached = false
  for (let index = 0; index < attachments.length; index += 1) {
    const item = attachments[index]
    if (!item || !item.storage) {
      continue
    }
    const handle = hijackWebStorage(item.storage, item.id, handleChange)
    if (handle) {
      handles.push(handle)
      attached = true
    }
  }
  if (attached || handles.length > 0) {
    started = true
  }
}

export function stopNativeHijack() {
  if (!started) {
    return
  }
  for (let index = 0; index < handles.length; index += 1) {
    handles[index].restore()
  }
  handles = []
  started = false
}

function ensureStarted() {
  if (!started) {
    startNativeHijack()
  }
}

function handleChange(change: StorageChange) {
  emitter.emit(change)
}

function resolveWindow(windowRef?: Window) {
  if (windowRef) {
    return windowRef
  }
  if (typeof window !== 'undefined') {
    return window
  }
  return undefined
}

// auto attempt on module load (no-op in SSR)
startNativeHijack()
