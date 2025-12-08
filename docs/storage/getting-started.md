# 快速开始

## 安装

```bash
npm install @baicie/storage
# or
pnpm add @baicie/storage
# or
yarn add @baicie/storage
```

## 订阅变更

```ts
import { subscribeStorageChanges } from '@baicie/storage'

const stop = subscribeStorageChanges(change => {
  console.info('[storage]', change.key, change.type, change.value)
})

localStorage.setItem('user', JSON.stringify({ id: 'u1' }))
sessionStorage.removeItem('legacyToken')

stop()
```

## 手动控制劫持

在 SSR 或多实例环境下，你可以显式调用 `startNativeHijack`：

```ts
import { startNativeHijack, stopNativeHijack } from '@baicie/storage'

startNativeHijack({
  windowRef: window,
  local: true,
  session: false,
})

// ... do something

stopNativeHijack()
```

`storages` 选项允许你注入任意实现了 Storage 接口的对象：

```ts
import { startNativeHijack } from '@baicie/storage'

const memoryStorage: Storage = {
  // 自行实现 Storage 接口
}

startNativeHijack({
  local: false,
  session: false,
  storages: [{ storage: memoryStorage, id: 'memory' }],
})
```

## 仅劫持单个 Storage

如果不想启用全局逻辑，可以直接使用 `hijackWebStorage`：

```ts
import { hijackWebStorage } from '@baicie/storage'

const handle = hijackWebStorage(localStorage, 'local-storage', change => {
  console.log(change)
})

// 需要恢复时
handle?.restore()
```

## StorageChange 类型

```ts
interface StorageChange {
  key: string
  value: string | null
  type: 'write' | 'remove' | 'clear'
  source: string
}
```

默认 Source 为 `local-storage` 与 `session-storage`，你也可以在自定义劫持时传入任意 ID。
