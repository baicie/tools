import type { StorageChange, StorageChangeListener } from './types'

export function createEmitter() {
  var listeners: StorageChangeListener[] = []

  function subscribe(listener: StorageChangeListener) {
    listeners.push(listener)
    return function unsubscribe() {
      var index = listeners.indexOf(listener)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }

  function emit(change: StorageChange) {
    var index = 0
    while (index < listeners.length) {
      listeners[index](change)
      index += 1
    }
  }

  function clear() {
    listeners = []
  }

  return {
    subscribe: subscribe,
    emit: emit,
    clear: clear,
  }
}
