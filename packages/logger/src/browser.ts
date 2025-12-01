/* eslint-disable no-restricted-globals */
/**
 * 浏览器环境检测工具
 */

/**
 * 检查是否在浏览器环境
 */
export function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof navigator !== 'undefined'
  )
}

/**
 * 安全获取 window 对象
 */
export function getWindow(): Window | undefined {
  if (typeof window !== 'undefined') {
    return window
  }
  return undefined
}
