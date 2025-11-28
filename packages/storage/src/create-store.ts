import { createEmitter } from './emitter'
import { stringCodec } from './codecs'
import type {
  StorageAdapter,
  StorageBinding,
  StorageBindingSubscriber,
  StorageBindingUpdater,
  StorageChange,
  StorageCodec,
  StorageStore,
  StorageSubscriber,
} from './types'
import { WILDCARD_KEY } from './types'

export function createStorageStore(adapter: StorageAdapter): StorageStore {
  var emitter = createEmitter()
  var disposeExternal =
    typeof adapter.listen === 'function'
      ? adapter.listen(handleExternalChange)
      : undefined

  function handleExternalChange(change: StorageChange) {
    emitter.emit(change)
  }

  function get(key: string) {
    return adapter.read(key)
  }

  function set(key: string, value: string) {
    return adapter.write(key, value).then(function () {
      notify({
        key,
        value,
        type: 'write',
        source: adapter.id,
      })
    })
  }

  function remove(key: string) {
    return adapter.remove(key).then(function () {
      notify({
        key,
        value: null,
        type: 'remove',
        source: adapter.id,
      })
    })
  }

  function keys() {
    return adapter.keys()
  }

  function clear() {
    return adapter.keys().then(function (currentKeys) {
      return adapter.clear().then(function () {
        var index = 0
        while (index < currentKeys.length) {
          notify({
            key: currentKeys[index],
            value: null,
            type: 'clear',
            source: adapter.id,
          })
          index += 1
        }
      })
    })
  }

  function subscribe(key: string, subscriber: StorageSubscriber) {
    var resolvedKey = key || WILDCARD_KEY
    return emitter.subscribe(resolvedKey, subscriber)
  }

  function notify(change: StorageChange) {
    emitter.emit(change)
  }

  function bind<TValue>(
    key: string,
    codec?: StorageCodec<TValue>,
  ): StorageBinding<TValue> {
    var resolvedCodec =
      codec || (stringCodec as unknown as StorageCodec<TValue>)

    function readBindingValue() {
      return get(key).then(function (serialized) {
        return resolvedCodec.decode(serialized)
      })
    }

    function writeBindingValue(value: TValue) {
      return set(key, resolvedCodec.encode(value))
    }

    function updateBindingValue(updater: StorageBindingUpdater<TValue>) {
      return readBindingValue().then(function (current) {
        var nextValue = updater(current)
        return writeBindingValue(nextValue)
      })
    }

    function subscribeBinding(subscriber: StorageBindingSubscriber<TValue>) {
      return emitter.subscribe(key, function (change) {
        subscriber(resolvedCodec.decode(change.value), change)
      })
    }

    function removeBindingValue() {
      return remove(key)
    }

    return {
      read: readBindingValue,
      write: writeBindingValue,
      update: updateBindingValue,
      subscribe: subscribeBinding,
      remove: removeBindingValue,
    }
  }

  function dispose() {
    emitter.clear()
    if (disposeExternal) {
      disposeExternal()
    }
  }

  return {
    get,
    set,
    remove,
    clear,
    keys,
    subscribe,
    bind,
    dispose,
  }
}
