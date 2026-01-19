import type { NativeSubscribeOptions } from './native-watcher'
import type { StorageChange, StorageChangeListener } from './types'

export function createEmitter(): {
  subscribe: (
    listener: StorageChangeListener,
    options?: NativeSubscribeOptions,
  ) => () => void
  emit: (change: StorageChange) => void
  clear: () => void
} {
  type Sub = {
    listener: StorageChangeListener
    options?: NativeSubscribeOptions
  }

  let listeners: Sub[] = []

  function matchesFilter(change: StorageChange, opts?: NativeSubscribeOptions) {
    if (!opts) return true

    const { include, exclude } = opts

    const matches = (arr?: Partial<StorageChange>[]) =>
      arr?.some(
        rule =>
          (rule.key == null || rule.key === change.key) &&
          (rule.value == null || rule.value === change.value) &&
          (rule.type == null || rule.type === change.type) &&
          (rule.source == null || rule.source === change.source),
      )

    // include 优先
    if (include && include.length > 0 && !matches(include)) return false
    if (exclude && matches(exclude)) return false

    return true
  }

  function subscribe(
    listener: StorageChangeListener,
    options?: NativeSubscribeOptions,
  ) {
    const obj = { listener, options }
    listeners.push(obj)
    return (): void => {
      const i = listeners.indexOf(obj)
      if (i > -1) listeners.splice(i, 1)
    }
  }

  function emit(change: StorageChange): void {
    for (const sub of listeners) {
      if (matchesFilter(change, sub.options)) {
        sub.listener(change)
      }
    }
  }

  function clear(): void {
    listeners = []
  }

  return {
    subscribe,
    emit: emit as (change: StorageChange) => void,
    clear: clear as () => void,
  }
}
