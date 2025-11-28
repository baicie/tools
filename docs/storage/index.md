# @baicie/storage

一个统一 localStorage / sessionStorage / Cookie / IndexedDB 的轻量代理层，默认提供发布—订阅能力，帮助你在任意业务模块之间同步状态。

## 核心特性

- 🔌 **统一 API**：同一套 `get/set/remove/clear/keys` 接口即插即用
- 📡 **响应式通知**：内置事件总线，跨组件或跨标签页自动广播变更
- 💾 **多驱动适配**：根据运行环境自动降级为 Memory 模式，避免报错
- 🧱 **可插拔 Codec**：通过编解码器自定义任何序列化协议
- 🧪 **类型安全**：完整 TypeScript 类型推导，轻松获得 key 对应的数据类型

## 架构概览

1. **Adapter**：封装底层读写逻辑（localStorage、Cookie、IndexedDB...）
2. **Store**：对外暴露统一 API，并负责派发通知
3. **Codec**：解决序列化/反序列化问题（内置 string/JSON，可自定义）
4. **Binding**：`store.bind(key)` 生成的对象，专注某个 key 的读写与订阅

```
业务代码A --(write)--+
                      |  store.emit(change)
业务代码B <--(subscribe)-- Adapter(localStorage/Cookie/IndexedDB…)
```

## 典型场景

### 跨页面 Session 同步

```ts
const store = createStorageStore(createLocalStorageAdapter())

store.subscribe('token', change => {
  console.info('[storage] token change', change)
})
```

### Cookie 兜底

```ts
const store = createStorageStore(
  createCookieAdapter({ path: '/', sameSite: 'Lax' }),
)

await store.set('locale', 'zh-CN')
```

### IndexedDB 大对象缓存

```ts
const cache = createStorageStore(
  createIndexedDBAdapter({ databaseName: 'app-cache' }),
)

const profile = cache.bind('profile', createJSONCodec<UserProfile>())
await profile.write({ id: 'u1', name: 'li' })
```

> 需要更细粒度行为？自定义 Adapter/Codec 即可，无需改动业务层。
