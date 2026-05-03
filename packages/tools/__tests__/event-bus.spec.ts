import { describe, expect, it, vi } from 'vitest'
import { EventBus } from '../src/event-bus'

describe('EventBus', () => {
  it('应该创建实例', () => {
    const bus = new EventBus()
    expect(bus).toBeDefined()
  })

  describe('on/off', () => {
    it('应该订阅事件', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('test', handler)
      bus.emit('test', 'payload')

      expect(handler).toHaveBeenCalledWith('payload')
    })

    it('应该取消订阅事件', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('test', handler)
      bus.off('test', handler)
      bus.emit('test', 'payload')

      expect(handler).not.toHaveBeenCalled()
    })

    it('应该返回取消订阅函数', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      const unsubscribe = bus.on('test', handler)
      unsubscribe()
      bus.emit('test', 'payload')

      expect(handler).not.toHaveBeenCalled()
    })

    it('同一个事件可以注册多个处理器', () => {
      const bus = new EventBus()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      bus.on('test', handler1)
      bus.on('test', handler2)
      bus.emit('test', 'payload')

      expect(handler1).toHaveBeenCalledWith('payload')
      expect(handler2).toHaveBeenCalledWith('payload')
    })
  })

  describe('once', () => {
    it('应该只触发一次', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.once('test', handler)
      bus.emit('test', 'payload1')
      bus.emit('test', 'payload2')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith('payload1')
    })

    it('once 应该返回取消订阅函数', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      const unsubscribe = bus.once('test', handler)
      unsubscribe()
      bus.emit('test', 'payload')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('emit', () => {
    it('应该传递载荷给处理器', () => {
      const bus = new EventBus<{ event: string }>()
      const handler = vi.fn()

      bus.on('event', handler)
      bus.emit('event', 'test')

      expect(handler).toHaveBeenCalledWith('test')
    })

    it('emit 时订阅/取消订阅不应该影响当前触发', () => {
      const bus = new EventBus()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      bus.on('test', () => {
        handler1()
        bus.on('test', handler2)
      })

      bus.emit('test', undefined)

      expect(handler1).toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })
  })

  describe('clear', () => {
    it('应该清空指定事件', () => {
      const bus = new EventBus()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      bus.on('event1', handler1)
      bus.on('event2', handler2)
      bus.clear('event1')
      bus.emit('event1', undefined)
      bus.emit('event2', undefined)

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('不带参数应该清空所有事件', () => {
      const bus = new EventBus()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      bus.on('event1', handler1)
      bus.on('event2', handler2)
      bus.clear()
      bus.emit('event1', undefined)
      bus.emit('event2', undefined)

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })
  })

  describe('泛型支持', () => {
    it('应该支持类型化事件', () => {
      interface Events {
        userLoggedIn: { userId: string; timestamp: number }
        userLoggedOut: { userId: string }
      }

      const bus = new EventBus<Events>()
      const handler = vi.fn()

      bus.on('userLoggedIn', handler)
      bus.emit('userLoggedIn', { userId: '123', timestamp: Date.now() })

      expect(handler).toHaveBeenCalled()
      expect(handler.mock.calls[0][0]).toHaveProperty('userId')
      expect(handler.mock.calls[0][0]).toHaveProperty('timestamp')
    })
  })
})
