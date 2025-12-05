import type { HijackHandle, StorageChangeListener } from './types'

/**
 * 解析 cookie 字符串，获取所有 cookie 的键值对
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieString) {
    return cookies
  }

  const pairs = cookieString.split(';')
  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i].trim()
    if (!pair) {
      continue
    }
    const equalIndex = pair.indexOf('=')
    if (equalIndex === -1) {
      continue
    }
    const key = pair.substring(0, equalIndex).trim()
    const value = pair.substring(equalIndex + 1).trim()
    if (key) {
      cookies[key] = value
    }
  }
  return cookies
}

/**
 * 从 cookie 字符串中获取指定 key 的值
 */
function getCookieValue(cookieString: string, key: string): string | null {
  const cookies = parseCookies(cookieString)
  return cookies[key] || null
}

/**
 * 劫持 document.cookie 来监听 Cookie 变化
 */
export function hijackCookie(
  documentRef: Document,
  adapterId: string,
  listener: StorageChangeListener,
): HijackHandle | undefined {
  try {
    if (!documentRef || typeof documentRef.cookie === 'undefined') {
      return undefined
    }

    // 保存原始的 cookie descriptor
    const cookieDescriptor = Object.getOwnPropertyDescriptor(
      documentRef,
      'cookie',
    )
    if (!cookieDescriptor) {
      return undefined
    }

    const originalGetter = cookieDescriptor.get
    const originalSetter = cookieDescriptor.set

    if (!originalGetter || !originalSetter) {
      return undefined
    }

    // 创建新的 getter
    const newGetter = function (): string {
      if (originalGetter) {
        return originalGetter.call(documentRef)
      }
      return ''
    }

    // 创建新的 setter
    const newSetter = function (value: string): void {
      if (!value || typeof value !== 'string') {
        if (originalSetter) {
          originalSetter.call(documentRef, value)
        }
        return
      }

      // 解析要设置的 cookie
      const parts = value.split(';')
      const keyValuePart = parts[0] || ''
      const equalIndex = keyValuePart.indexOf('=')
      if (equalIndex === -1) {
        // 无效格式，直接设置
        if (originalSetter) {
          originalSetter.call(documentRef, value)
        }
        return
      }

      const key = keyValuePart.substring(0, equalIndex).trim()

      if (!key) {
        if (originalSetter) {
          originalSetter.call(documentRef, value)
        }
        return
      }

      // 检查是否是删除操作（包含 expires 或 max-age=0）
      let isRemove = false
      for (let i = 1; i < parts.length; i += 1) {
        const part = parts[i].trim().toLowerCase()
        if (part.startsWith('expires=') || part === 'max-age=0') {
          isRemove = true
          break
        }
      }

      // 执行原始设置
      if (originalSetter) {
        originalSetter.call(documentRef, value)
      }

      // 获取设置后的实际值
      const currentCookieString = originalGetter
        ? originalGetter.call(documentRef)
        : ''
      const actualValue = getCookieValue(currentCookieString, key)

      // 触发监听事件
      if (isRemove || actualValue === null) {
        listener({
          key: key,
          value: null,
          type: 'remove',
          source: adapterId,
        })
      } else {
        listener({
          key: key,
          value: actualValue,
          type: 'write',
          source: adapterId,
        })
      }
    }

    // 劫持 cookie 属性
    Object.defineProperty(documentRef, 'cookie', {
      configurable: true,
      enumerable: true,
      get: newGetter,
      set: newSetter,
    })

    // 返回恢复函数
    return {
      restore: function () {
        if (cookieDescriptor) {
          Object.defineProperty(documentRef, 'cookie', cookieDescriptor)
        }
      },
    }
  } catch (_error) {
    return undefined
  }
}
