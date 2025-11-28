import type { StorageCodec } from './types'

export interface JSONCodecOptions {
  replacer?: (key: string, value: unknown) => unknown
  reviver?: (key: string, value: unknown) => unknown
  space?: number
}

export const stringCodec: StorageCodec<string> = {
  encode(value: string) {
    return String(value)
  },
  decode(serialized: string | null) {
    if (serialized === null) {
      return null
    }
    return serialized
  },
}

export function createJSONCodec<TValue>(
  options?: JSONCodecOptions,
): StorageCodec<TValue> {
  var resolvedOptions = options || {}
  return {
    encode(value: TValue) {
      return JSON.stringify(
        value,
        resolvedOptions.replacer,
        resolvedOptions.space,
      )
    },
    decode(serialized: string | null) {
      if (serialized === null) {
        return null
      }
      try {
        return JSON.parse(serialized, resolvedOptions.reviver)
      } catch (_error) {
        return null
      }
    },
  }
}
