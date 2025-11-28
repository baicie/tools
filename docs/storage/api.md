# API 参考

本文档覆盖 `@baicie/storage` 中最常用的类型、方法与适配器。

## createStorageStore(adapter)

```ts
import { createStorageStore, createLocalStorageAdapter } from '@baicie/storage'

const store = createStorageStore(createLocalStorageAdapter())
```

### 返回值：StorageStore

| 方法 | 说明 |
| ---- | ---- |
| `get(key)` | 读取序列化后的字符串值 |
| `set(key, value)` | 写入字符串，触发 `write` 通知 |
| `remove(key)` | 删除键值，触发 `remove` 通知 |
| `clear()` | 清空适配器中的全部 key，并逐个触发 `clear` 通知 |
| `keys()` | 获取当前所有 key（部分适配器可能按插入顺序返回） |
| `subscribe(key, listener)` | 订阅单个 key，或传入 `'*'` 作为通配监听 |
| `bind(key, codec?)` | 生成 `StorageBinding`，便于对该 key 进行高频读写 |
| `dispose()` | 清理内部事件，并解除适配器的外部监听 |

> `subscribe` 与 `bind().subscribe` 返回取消函数，务必在组件卸载时调用。

## StorageBinding

由 `store.bind('key', codec)` 创建：

| 方法 | 说明 |
| ---- | ---- |
| `read()` | 直接返回解码后的值 |
| `write(value)` | 编码后写入底层适配器 |
| `update(updater)` | 读取 → 交给 `updater` 生成新值 → 写回 |
| `remove()` | 等价于 `store.remove(key)` |
| `subscribe(listener)` | 监听该 key 的变动（已经解码） |

## StorageChange

```ts
interface StorageChange {
  key: string
  value: string | null
  type: 'write' | 'remove' | 'clear'
  source: string // 适配器 id，用于区分事件来源
}
```

`WILDCARD_KEY` 常量可用来订阅所有 key：`store.subscribe(WILDCARD_KEY, handler)`。

## 适配器 (Adapters)

所有适配器都实现 `StorageAdapter` 接口，只需传入 `createStorageStore(adapter)` 即可。每个工厂可按需接受配置：

### createLocalStorageAdapter(options?)

- `storage`: 自定义 `Storage` 实例，默认使用 `window.localStorage`
- `windowRef`: 自定义 `Window`，用于监听 `storage` 事件
- `id`: 自定义适配器 ID（默认 `local-storage`）

### createSessionStorageAdapter(options?)

参数同 localStorage，仅默认 ID 不同（`session-storage`）。

### createCookieAdapter(options?)

| 选项 | 默认值 | 说明 |
| ---- | ---- | ---- |
| `path` | `'/'` | Cookie Path |
| `domain` | `undefined` | Cookie Domain |
| `secure` | `false` | 仅 HTTPS 发送 |
| `sameSite` | `'Lax'` | SameSite 策略 |
| `maxAgeSeconds` | `undefined` | 过期时间（秒） |
| `expires` | `undefined` | `Date` 类型的绝对过期时间 |
| `documentRef` | `globalThis.document` | 自定义 `Document` |

### createIndexedDBAdapter(options?)

| 选项 | 默认值 | 说明 |
| ---- | ---- | ---- |
| `databaseName` | `'baicie-storage'` | IndexedDB 数据库名 |
| `storeName` | `'kv-store'` | Object Store 名 |
| `version` | `1` | 数据库版本号 |

IndexedDB 不可用或发生异常时会自动降级为内存存储。

### createMemoryAdapter(id?)

纯内存实现，适用于 SSR 或测试环境；`id` 默认 `memory`。

## 编解码器 (Codecs)

### stringCodec

默认 codec，直接在 `bind` 未传入 codec 时使用。

### createJSONCodec(options?)

| 选项 | 说明 |
| ---- | ---- |
| `replacer` | 传给 `JSON.stringify` 的自定义序列化逻辑 |
| `reviver` | 传给 `JSON.parse` 的反序列化逻辑 |
| `space` | `JSON.stringify` 的缩进参数 |

### 自定义 Codec

```ts
const booleanCodec = {
  encode(value: boolean) {
    return value ? '1' : '0'
  },
  decode(serialized: string | null) {
    if (serialized === null) {
      return null
    }
    return serialized === '1'
  },
}
```

只要实现 `encode` / `decode` 两个函数就能被 `bind` 调用。

## 生命周期建议

- 页面卸载前，如需持久化临时状态，使用 `await store.set` 确保写入完成
- SSR 时可优先使用 `createMemoryAdapter`，在客户端激活后再切换为浏览器适配器
- 大量监听时，建议按业务模块封装 `store.bind`，集中管理订阅与取消

