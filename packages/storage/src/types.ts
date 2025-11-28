export type StorageChangeType = 'write' | 'remove' | 'clear'

export interface StorageChange {
  key: string
  value: string | null
  type: StorageChangeType
  source: string
}

export interface StorageSubscriber {
  (change: StorageChange): void
}

export interface StorageAdapter {
  readonly id: string
  read(key: string): Promise<string | null>
  write(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
  listen?: (subscriber: StorageSubscriber) => () => void
}

export interface StorageCodec<TValue> {
  encode(value: TValue): string
  decode(serialized: string | null): TValue | null
}

export interface StorageBindingSubscriber<TValue> {
  (value: TValue | null, change: StorageChange): void
}

export interface StorageBindingUpdater<TValue> {
  (current: TValue | null): TValue
}

export interface StorageBinding<TValue> {
  read(): Promise<TValue | null>
  write(value: TValue): Promise<void>
  update(updater: StorageBindingUpdater<TValue>): Promise<void>
  subscribe(subscriber: StorageBindingSubscriber<TValue>): () => void
  remove(): Promise<void>
}

export interface StorageStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
  subscribe(key: string, subscriber: StorageSubscriber): () => void
  bind<TValue = string>(
    key: string,
    codec?: StorageCodec<TValue>,
  ): StorageBinding<TValue>
  dispose(): void
}

export const WILDCARD_KEY = '*'
