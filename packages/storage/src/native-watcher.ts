import { createEmitter } from './emitter'
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
  if (attached) {
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
