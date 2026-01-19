export type StorageChangeType = 'write' | 'remove' | 'clear' | 'read'

export interface StorageChange {
  key: string
  value: string | null
  type: StorageChangeType
  source: string
}

export interface StorageChangeListener {
  (change: StorageChange): void
}

export interface HijackHandle {
  restore(): void
}
