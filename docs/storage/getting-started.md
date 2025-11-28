# 快速开始

## 安装

```bash
npm install @baicie/storage
# or
pnpm add @baicie/storage
# or
yarn add @baicie/storage
```

## 创建 Store

```ts
import {
  createStorageStore,
  createLocalStorageAdapter,
  createJSONCodec,
} from '@baicie/storage'

const store = createStorageStore(createLocalStorageAdapter())
const userBinding = store.bind('user', createJSONCodec<UserInfo>())
```

## 写入与订阅

```ts
await userBinding.write({ id: 'u1', name: 'baicie' })

userBinding.subscribe((value, change) => {
  console.info('[storage] user updated', value, change)
})
```

`subscribe('*', listener)` 可以一次性监听所有 key：

```ts
store.subscribe('*', (change) => {
  console.log('any change', change.key, change.type)
})
```

## 在没有 Web Storage 的环境中使用

```ts
import { createCookieAdapter } from '@baicie/storage'

const kv = createStorageStore(
  createCookieAdapter({ path: '/', sameSite: 'Lax', maxAgeSeconds: 3600 }),
)
```

Adapter 会在检测到 API 不可用时自动回退至内存模式。

## 保持数据结构安全

通过 `createJSONCodec()` 或自定义 Codec，确保写入与读出的数据结构一致：

```ts
import type { StorageCodec } from '@baicie/storage'

const base64Codec: StorageCodec<string> = {
  encode(value) {
    return btoa(value)
  },
  decode(serialized) {
    return serialized ? atob(serialized) : null
  },
}

const token = store.bind('token', base64Codec)
await token.write('secret')
```

