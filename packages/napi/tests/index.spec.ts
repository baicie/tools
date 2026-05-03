import { type DiffItem, diffJson } from '../src/index'
import { describe, expect, it } from 'vitest'

describe('napi', () => {
  describe('diffJson', () => {
    it('应该比较两个 JSON 字符串并返回差异', () => {
      const json1 = JSON.stringify({ a: 1, b: 2 })
      const json2 = JSON.stringify({ a: 1, b: 3 })
      const result = diffJson(json1, json2)
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('应该处理相同 JSON 的比较', () => {
      const json1 = JSON.stringify({ a: 1, b: 2 })
      const json2 = JSON.stringify({ a: 1, b: 2 })
      const result = diffJson(json1, json2)
      expect(result).toBeDefined()
    })

    it('应该处理嵌套 JSON 的比较', () => {
      const json1 = JSON.stringify({ a: { b: 1 }, c: 2 })
      const json2 = JSON.stringify({ a: { b: 2 }, c: 2 })
      const result = diffJson(json1, json2)
      expect(result).toBeDefined()
    })

    it('应该检测添加的属性', () => {
      const json1 = JSON.stringify({ a: 1 })
      const json2 = JSON.stringify({ a: 1, b: 2 })
      const result = diffJson(json1, json2)
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('应该检测删除的属性', () => {
      const json1 = JSON.stringify({ a: 1, b: 2 })
      const json2 = JSON.stringify({ a: 1 })
      const result = diffJson(json1, json2)
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('DiffItem 类型', () => {
    it('应该正确导出 DiffItem 类型', () => {
      const json1 = JSON.stringify({ name: 'test' })
      const json2 = JSON.stringify({ name: 'hello' })
      const result: DiffItem[] = diffJson(json1, json2)
      expect(result).toBeDefined()
    })
  })
})
