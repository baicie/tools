import { describe, expect, it } from 'vitest'
import {
  cleanObject,
  compareVersions,
  deepClone,
  formatDependencyList,
  getPackageScope,
  isEmptyObject,
  isScopedPackage,
  mergePackageJson,
  normalizePackageName,
  safeParseJson,
  sortObject,
} from '../src/utils'

describe('sortObject', () => {
  it('应该按字母顺序排序对象的键', () => {
    const obj = { z: 1, a: 2, m: 3 }
    const result = sortObject(obj)

    expect(Object.keys(result)).toEqual(['a', 'm', 'z'])
  })
})

describe('deepClone', () => {
  it('应该深度克隆对象', () => {
    const obj = { a: 1, b: { c: 2 } }
    const cloned = deepClone(obj)

    cloned.b.c = 3
    expect(obj.b.c).toBe(2)
  })

  it('应该克隆数组', () => {
    const arr: [number, number, { a: number }] = [1, 2, { a: 3 }]
    const cloned = deepClone(arr)

    cloned[2].a = 4
    expect(arr[2].a).toBe(3)
  })
})

describe('safeParseJson', () => {
  it('应该解析有效的 JSON', () => {
    const result = safeParseJson('{"name":"test"}')

    expect(result).toEqual({ name: 'test' })
  })

  it('应该在无效 JSON 时返回 null', () => {
    const result = safeParseJson('invalid json')

    expect(result).toBeNull()
  })
})

describe('isEmptyObject', () => {
  it('应该正确识别空对象', () => {
    expect(isEmptyObject({})).toBe(true)
    expect(isEmptyObject({ a: 1 })).toBe(false)
    expect(isEmptyObject(null)).toBe(false)
  })
})

describe('cleanObject', () => {
  it('应该移除空值', () => {
    const obj = {
      a: 1,
      b: '',
      c: null,
      d: undefined,
      e: [],
      f: {},
    }
    const result = cleanObject(obj)

    expect(result.a).toBe(1)
    expect(result.b).toBeUndefined()
    expect(result.c).toBeUndefined()
    expect(result.d).toBeUndefined()
  })

  it('应该保留非空数组', () => {
    const obj = { arr: [1, 2, 3] }
    const result = cleanObject(obj)

    expect(result.arr).toEqual([1, 2, 3])
  })

  it('应该递归清理嵌套对象', () => {
    const obj = { a: 1, b: { c: null, d: 2 } }
    const result = cleanObject(obj)

    expect(result.a).toBe(1)
    expect((result.b as any).c).toBeUndefined()
    expect((result.b as any).d).toBe(2)
  })

  it('应该移除空数组', () => {
    const obj = { a: 1, b: [] }
    const result = cleanObject(obj)

    expect(result.a).toBe(1)
    expect(result.b).toBeUndefined()
  })
})

describe('mergePackageJson', () => {
  it('应该合并两个 package.json', () => {
    const base = {
      name: 'test',
      version: '1.0.0',
      dependencies: { react: '^18.0.0' },
    }
    const override = {
      version: '2.0.0',
      dependencies: { vue: '^3.0.0' },
    }
    const result = mergePackageJson(base as any, override)

    expect(result.name).toBe('test')
    expect(result.version).toBe('2.0.0')
    expect(result.dependencies?.react).toBe('^18.0.0')
    expect(result.dependencies?.vue).toBe('^3.0.0')
  })

  it('应该合并 scripts', () => {
    const base = { scripts: { dev: 'echo dev', build: 'echo build' } }
    const override = { scripts: { test: 'vitest' } }
    const result = mergePackageJson(base as any, override)

    expect(result.scripts?.dev).toBe('echo dev')
    expect(result.scripts?.build).toBe('echo build')
    expect(result.scripts?.test).toBe('vitest')
  })

  it('应该跳过 undefined 值', () => {
    const base = { name: 'test', version: '1.0.0' }
    const override = { version: undefined }
    const result = mergePackageJson(base as any, override)

    expect(result.name).toBe('test')
    expect(result.version).toBe('1.0.0')
  })
})

describe('compareVersions', () => {
  it('应该正确比较版本号', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
  })

  it('应该处理不同长度的版本号', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.1.0', '1.0.0.0')).toBe(1)
  })

  it('应该处理带前缀的版本号', () => {
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0)
  })
})

describe('normalizePackageName', () => {
  it('应该规范化包名', () => {
    expect(normalizePackageName('Test-Package')).toBe('test-package')
    expect(normalizePackageName('@scope/Package')).toBe('package')
  })

  it('应该处理作用域包', () => {
    expect(normalizePackageName('@Scope/Package-Name')).toBe('package-name')
  })
})

describe('getPackageScope', () => {
  it('应该提取作用域', () => {
    expect(getPackageScope('@scope/package')).toBe('scope')
    expect(getPackageScope('package')).toBe(null)
  })

  it('应该处理复杂作用域', () => {
    expect(getPackageScope('@org-name/package-name')).toBe('org-name')
  })
})

describe('isScopedPackage', () => {
  it('应该识别作用域包', () => {
    expect(isScopedPackage('@scope/package')).toBe(true)
    expect(isScopedPackage('package')).toBe(false)
  })

  it('应该识别非作用域包', () => {
    expect(isScopedPackage('@scope')).toBe(false)
  })
})

describe('formatDependencyList', () => {
  it('应该格式化依赖列表', () => {
    const deps = { react: '^18.0.0', vue: '^3.0.0' }
    const result = formatDependencyList(deps)

    expect(result).toContain('react@^18.0.0')
    expect(result).toContain('vue@^3.0.0')
  })

  it('应该处理空依赖', () => {
    expect(formatDependencyList({})).toEqual([])
  })

  it('应该处理 undefined', () => {
    expect(formatDependencyList(undefined)).toEqual([])
  })
})
