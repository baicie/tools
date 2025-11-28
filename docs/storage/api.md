# API 参考

本页介绍 `@baicie/storage` 暴露的全部 API（不再包含 Store/Adapter/Codec 等概念）。

## subscribeStorageChanges(listener)

```ts
import { subscribeStorageChanges } from '@baicie/storage'

const stop = subscribeStorageChanges(change => {
  console.info(change.key, change.type, change.value)
})
```

- **作用**：订阅所有 Web Storage 写入 / 删除 / 清空事件
- **返回值**：取消订阅函数
- **注意**：调用时若尚未劫持，则会自动启动；多次订阅共用同一个全局劫持实例

## startNativeHijack(options?)

手动开启劫持，适用于 SSR 或测试环境。常用配置：

| 选项        | 说明                                                   |
| ----------- | ------------------------------------------------------ |
| `windowRef` | 指定 `Window` 对象，默认使用全局 `window`              |
| `local`     | 是否劫持 `windowRef.localStorage`，默认 `true`         |
| `session`   | 是否劫持 `windowRef.sessionStorage`，默认 `true`       |
| `storages`  | 额外注入的 `Storage` 列表（格式：`{ storage, id }[]`） |

```ts
startNativeHijack({
  windowRef: customWindow,
  local: true,
  session: false,
  storages: [{ storage: memoryLikeStorage, id: 'memory' }],
})
```

## stopNativeHijack()

恢复所有被劫持的 `Storage` 方法，并清空内部句柄。再次订阅或手动调用 `startNativeHijack()` 会重新劫持。

## hijackWebStorage(storage, id, listener)

底层劫持工具，用于在自定义场景下接管任意 `Storage` 实例。

```ts
const handle = hijackWebStorage(localStorage, 'local-storage', change => {
  console.log(change)
})

// 需要恢复时
handle?.restore()
```

> 适合在多实例架构中按需接管，而无需启动全局劫持。

## StorageChange 类型

```ts
interface StorageChange {
  key: string
  value: string | null
  type: 'write' | 'remove' | 'clear'
  source: string // e.g. 'local-storage'
}
```

- `key`：被操作的键
- `value`：写入后的值，删除/清空时为 `null`
- `type`：`write`（写入/覆盖）、`remove`（单个删除）、`clear`（全量清空）
- `source`：来源标识，默认 `local-storage` or `session-storage`，自定义可任意命名

## 生命周期建议

- SSR 中可以忽略 `startNativeHijack`，因为默认实现会检测 `window`
- 如果担心第三方也会覆写 `localStorage`，可以在 `startNativeHijack` 之后立刻 `stopNativeHijack` 再 `startNativeHijack`，以确保顺序
- 建议在调试阶段订阅日志，排查是否存在异常调用
