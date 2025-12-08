# @baicie/storage

极简的 Web Storage 劫持层。它会在同标签页自动接管 `localStorage`、`sessionStorage` 的 `setItem`/`removeItem`/`clear`，并把所有变更广播出去，业务代码无需做任何改造。

## 特性

- 🛰️ **零侵入**：继续使用原生 API；我们只监听并派发事件
- 📡 **同标签页补完**：原生 `storage` 事件只覆盖跨标签页，这里补齐同标签页场景
- 🪶 **无状态**：没有 store/adapter/codec 等概念，只有订阅与取消
- 🔄 **可控劫持**：如果需要，`stopNativeHijack()` 可立即恢复原始方法

## 快速上手

```ts
import { subscribeStorageChanges } from '@baicie/storage'

const stop = subscribeStorageChanges(change => {
  console.info(
    `[storage][${change.source}] ${change.key} =>`,
    change.value,
    change.type,
  )
})

// 业务逻辑照常写
sessionStorage.setItem('user', JSON.stringify({ id: 'u1' }))
sessionStorage.removeItem('user')

// 完成时取消订阅
stop()
```

## API

| API                                       | 说明                                                 |
| ----------------------------------------- | ---------------------------------------------------- |
| `subscribeStorageChanges(listener)`       | 订阅所有写入/删除/清空，返回取消函数                 |
| `startNativeHijack(options?)`             | 手动启动劫持，可注入 `windowRef` 或自定义 `storages` |
| `stopNativeHijack()`                      | 恢复所有被劫持的方法                                 |
| `hijackWebStorage(storage, id, listener)` | 劫持单个 `Storage` 实例，返回 `restore()`            |

### StorageChange

```ts
interface StorageChange {
  key: string
  value: string | null
  type: 'write' | 'remove' | 'clear'
  source: string
}
```

> 默认在模块加载时尝试劫持一次；SSR 环境下不会报错，等到客户端订阅时再自动启动。
