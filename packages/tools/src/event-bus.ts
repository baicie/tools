// event-bus.ts
type EventHandler<T = any> = (payload: T) => void

export class EventBus<
  Events extends Record<string, any> = Record<string, any>,
> {
  // 存储事件与回调
  private listeners: Map<keyof Events, Set<EventHandler>> = new Map()

  /**
   * 订阅事件
   * @param event 事件名
   * @param handler 回调
   */
  on<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
    return () => this.off(event, handler) // 返回取消订阅函数
  }

  /**
   * 订阅一次性事件，触发后自动移除
   */
  once<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
  ): () => void {
    const wrapper = (payload: Events[K]) => {
      handler(payload)
      this.off(event, wrapper)
    }
    return this.on(event, wrapper)
  }

  /**
   * 取消订阅事件
   */
  off<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
  ): void {
    this.listeners.get(event)?.delete(handler)
  }

  /**
   * 发布事件
   */
  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      // 拷贝一份，避免回调中 on/off 导致迭代问题
      ;[...handlers].forEach(handler => handler(payload))
    }
  }

  /**
   * 清空某个事件或所有事件
   */
  clear(event?: keyof Events): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}
