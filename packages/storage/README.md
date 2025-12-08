# @baicie/storage

极简 Web Storage 劫持与通知工具。模块加载后自动接管 `localStorage`/`sessionStorage` 的 `setItem`、`removeItem`、`clear`，对原生 API 完全零侵入；你只需要订阅事件即可实时接收任何 key 的变更。

## 特性

- 🛰️ **零改造**：业务仍旧调用原生 API，本库只做监听与广播
- 📡 **同标签页补完**：原有 `storage` 事件只覆盖跨标签页，这里补齐同标签页场景
- 🪶 **轻量实现**：只有劫持 + 事件调度，没有上下文和依赖
- 🔄 **可撤销**：调用 `stopNativeHijack()` 即可恢复所有原始方法

## 快速开始

```ts
import { subscribeStorageChanges } from '@baicie/storage'

const unsubscribe = subscribeStorageChanges(change => {
  console.info(
    `[storage][${change.source}] ${change.key} ->`,
    change.value,
    change.type,
  )
})

// 业务代码保持原状
localStorage.setItem('token', 'abc123')

// 完成时取消订阅
unsubscribe()
```

> 订阅函数内部会自动启动劫持逻辑；模块初始化时也会尝试一次，无需手动调用。

## API 速览

| API                                       | 说明                                                 |
| ----------------------------------------- | ---------------------------------------------------- |
| `subscribeStorageChanges(listener)`       | 订阅全部变更，返回取消函数                           |
| `startNativeHijack(options?)`             | 手动启动劫持，可注入 `windowRef` 或自定义 `storages` |
| `stopNativeHijack()`                      | 停止劫持并恢复所有原始方法                           |
| `hijackWebStorage(storage, id, listener)` | 仅针对单个 `Storage` 实例劫持，返回 `restore()` 句柄 |

### StorageChange

```ts
interface StorageChange {
  key: string
  value: string | null
  type: 'write' | 'remove' | 'clear'
  source: string // 例如 'local-storage'
}
```

## 常见问题

- **是否影响原生行为？** 不会。劫持仅包裹原函数，在执行后发送通知，返回值与异常保持一致。
- **可以监听 Cookie/IndexedDB 吗？** 当前专注 Web Storage。可参考 `hijackWebStorage` 的实现自行扩展。
- **SSR 会报错吗？** 不会。如果 `window` 不存在则不会启动劫持，等到客户端调用 `subscribeStorageChanges` 或 `startNativeHijack` 时再尝试一次。
