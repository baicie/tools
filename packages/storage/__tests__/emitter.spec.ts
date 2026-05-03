import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmitter } from '../src/emitter'
import type { StorageChange } from '../src/types'

describe('emitter', () => {
  let emitter: ReturnType<typeof createEmitter>

  beforeEach(() => {
    emitter = createEmitter()
  })

  afterEach(() => {
    emitter.clear()
  })

  describe('subscribe', () => {
    it('应该订阅变更事件', () => {
      const listener = vi.fn()
      const unsubscribe = emitter.subscribe(listener)

      emitter.emit({
        key: 'test',
        value: 'value',
        type: 'write',
        source: 'test',
      })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith({
        key: 'test',
        value: 'value',
        type: 'write',
        source: 'test',
      })

      unsubscribe()
    })

    it('应该返回取消订阅函数', () => {
      const listener = vi.fn()
      const unsubscribe = emitter.subscribe(listener)

      unsubscribe()
      emitter.emit({
        key: 'test',
        value: 'value',
        type: 'write',
        source: 'test',
      })

      expect(listener).not.toHaveBeenCalled()
    })

    it('应该支持多个订阅者', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      emitter.subscribe(listener1)
      emitter.subscribe(listener2)

      emitter.emit({
        key: 'test',
        value: 'value',
        type: 'write',
        source: 'test',
      })

      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
    })

    it('取消订阅一个不应该影响其他订阅者', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const unsubscribe1 = emitter.subscribe(listener1)
      emitter.subscribe(listener2)

      unsubscribe1()
      emitter.emit({
        key: 'test',
        value: 'value',
        type: 'write',
        source: 'test',
      })

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalledTimes(1)
    })
  })

  describe('emit', () => {
    it('应该发送变更事件', () => {
      const listener = vi.fn()
      emitter.subscribe(listener)

      const change: StorageChange = {
        key: 'token',
        value: 'abc123',
        type: 'write',
        source: 'local-storage',
      }

      emitter.emit(change)

      expect(listener).toHaveBeenCalledWith(change)
    })

    it('应该处理 read 类型变更', () => {
      const listener = vi.fn()
      emitter.subscribe(listener)

      emitter.emit({
        key: 'session',
        value: 'data',
        type: 'read',
        source: 'session-storage',
      })

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'read' }),
      )
    })

    it('应该处理 remove 类型变更', () => {
      const listener = vi.fn()
      emitter.subscribe(listener)

      emitter.emit({
        key: 'token',
        value: null,
        type: 'remove',
        source: 'local-storage',
      })

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'remove', value: null }),
      )
    })

    it('应该处理 clear 类型变更', () => {
      const listener = vi.fn()
      emitter.subscribe(listener)

      emitter.emit({
        key: 'local-storage',
        value: null,
        type: 'clear',
        source: 'local-storage',
      })

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'clear' }),
      )
    })
  })

  describe('clear', () => {
    it('应该清空所有订阅', () => {
      const listener = vi.fn()
      emitter.subscribe(listener)

      emitter.clear()
      emitter.emit({
        key: 'test',
        value: 'value',
        type: 'write',
        source: 'test',
      })

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('过滤选项', () => {
    it('include 选项应该只触发匹配的变更', () => {
      const listener = vi.fn()
      emitter.subscribe(listener, {
        include: [{ key: 'token' }],
      })

      emitter.emit({ key: 'token', value: 'v1', type: 'write', source: 'test' })
      emitter.emit({ key: 'other', value: 'v2', type: 'write', source: 'test' })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'token' }),
      )
    })

    it('exclude 选项应该排除匹配的变更', () => {
      const listener = vi.fn()
      emitter.subscribe(listener, {
        exclude: [{ key: 'secret' }],
      })

      emitter.emit({ key: 'token', value: 'v1', type: 'write', source: 'test' })
      emitter.emit({
        key: 'secret',
        value: 'v2',
        type: 'write',
        source: 'test',
      })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'token' }),
      )
    })

    it('include 和 exclude 可以同时使用', () => {
      const listener = vi.fn()
      emitter.subscribe(listener, {
        include: [{ type: 'write' }],
        exclude: [{ key: 'secret' }],
      })

      emitter.emit({ key: 'token', value: 'v1', type: 'write', source: 'test' })
      emitter.emit({
        key: 'secret',
        value: 'v2',
        type: 'write',
        source: 'test',
      })
      emitter.emit({ key: 'token', value: 'v1', type: 'read', source: 'test' })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'token', type: 'write' }),
      )
    })

    it('空的 include 应该匹配所有', () => {
      const listener = vi.fn()
      emitter.subscribe(listener, {
        include: [],
      })

      emitter.emit({
        key: 'test',
        value: 'value',
        type: 'write',
        source: 'test',
      })

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('source 过滤应该工作', () => {
      const listener = vi.fn()
      emitter.subscribe(listener, {
        include: [{ source: 'local-storage' }],
      })

      emitter.emit({
        key: 'a',
        value: '1',
        type: 'write',
        source: 'local-storage',
      })
      emitter.emit({
        key: 'b',
        value: '2',
        type: 'write',
        source: 'session-storage',
      })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'local-storage' }),
      )
    })
  })
})
