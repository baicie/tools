import type { StorageChange, StorageSubscriber } from './types'

interface SubscribersMap {
  [key: string]: StorageSubscriber[]
}

export function createEmitter() {
  var subscribers: SubscribersMap = {}

  function subscribe(key: string, listener: StorageSubscriber) {
    var list = subscribers[key]
    if (!list) {
      list = []
      subscribers[key] = list
    }
    list.push(listener)
    return function unsubscribe() {
      removeListener(key, listener)
    }
  }

  function emit(change: StorageChange) {
    dispatchToKey(change.key, change)
    dispatchToKey('*', change)
  }

  function clear() {
    subscribers = {}
  }

  function dispatchToKey(key: string, change: StorageChange) {
    var list = subscribers[key]
    if (!list || list.length === 0) {
      return
    }
    var index = 0
    while (index < list.length) {
      list[index](change)
      index += 1
    }
  }

  function removeListener(key: string, listener: StorageSubscriber) {
    var list = subscribers[key]
    if (!list || list.length === 0) {
      return
    }
    var index = list.indexOf(listener)
    if (index === -1) {
      return
    }
    list.splice(index, 1)
    if (list.length === 0) {
      delete subscribers[key]
    }
  }

  return {
    subscribe,
    emit,
    clear,
  }
}
