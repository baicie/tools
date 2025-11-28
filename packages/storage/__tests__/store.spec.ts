import { describe, expect, it } from 'vitest'
import { createStorageStore } from '../src/create-store'
import { createMemoryAdapter } from '../src/adapters/memory'
import { createJSONCodec } from '../src/codecs'
import { WILDCARD_KEY } from '../src/types'

describe('storage store', () => {
  it('notifies keyed subscribers', () => {
    var store = createStorageStore(createMemoryAdapter('spec'))
    var called: string[] = []

    store.subscribe('token', function (change) {
      called.push(change.type + ':' + (change.value || ''))
    })

    return store
      .set('token', 'value')
      .then(function () {
        return store.remove('token')
      })
      .then(function () {
        expect(called).toEqual(['write:value', 'remove:'])
      })
  })

  it('notifies wildcard subscribers on clear', () => {
    var store = createStorageStore(createMemoryAdapter('spec'))
    var called: string[] = []

    store.subscribe(WILDCARD_KEY, function (change) {
      called.push(change.key + ':' + change.type)
    })

    return store
      .set('a', '1')
      .then(function () {
        return store.set('b', '2')
      })
      .then(function () {
        return store.clear()
      })
      .then(function () {
        expect(called).toEqual(['a:write', 'b:write', 'a:clear', 'b:clear'])
      })
  })

  it('bind keeps data in sync with codec', () => {
    var store = createStorageStore(createMemoryAdapter('spec'))
    var codec = createJSONCodec<number>()
    var binding = store.bind<number>('count', codec)
    var observed: Array<number | null> = []

    binding.subscribe(function (value) {
      observed.push(value)
    })

    return binding
      .write(1)
      .then(function () {
        return binding.update(function (current) {
          return (current || 0) + 1
        })
      })
      .then(function () {
        return binding.read()
      })
      .then(function (value) {
        expect(value).toBe(2)
        expect(observed).toEqual([1, 2])
      })
  })
})
