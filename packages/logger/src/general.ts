/**
 * 通用工具函数
 */

/**
 * 浅拷贝合并对象（兼容 ES2016，不使用对象展开运算符）
 */
export function extend<T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) {
    return target
  }

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    if (source) {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          target[key] = source[key] as T[Extract<keyof T, string>]
        }
      }
    }
  }

  return target
}
