export type StorageChangeType = 'write' | 'remove' | 'clear'

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
