import { describe, expect, it } from 'vitest'
import {
  average,
  chunk,
  compact,
  difference,
  flatten,
  groupBy,
  intersection,
  paginate,
  sample,
  sampleSize,
  shuffle,
  sum,
  union,
  unique,
  uniqueBy,
} from '../src/array'

describe('unique', () => {
  it('应该去重数组', () => {
    expect(unique([1, 2, 2, 3, 3, 4])).toEqual([1, 2, 3, 4])
    expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
  })
})

describe('uniqueBy', () => {
  it('应该根据属性去重', () => {
    const arr = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 1, name: 'c' },
    ]
    const result = uniqueBy(arr, 'id')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(2)
  })
})

describe('groupBy', () => {
  it('应该按属性分组', () => {
    const arr = [
      { type: 'a', val: 1 },
      { type: 'b', val: 2 },
      { type: 'a', val: 3 },
    ]
    const result = groupBy(arr, 'type')
    expect(result.a).toHaveLength(2)
    expect(result.b).toHaveLength(1)
  })
})

describe('chunk', () => {
  it('应该将数组分块', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })
})

describe('shuffle', () => {
  it('应该打乱数组并保持元素不变', () => {
    const arr = [1, 2, 3, 4, 5]
    const shuffled = shuffle(arr)
    expect(shuffled).toHaveLength(5)
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('不应该改变原数组', () => {
    const arr = [1, 2, 3, 4, 5]
    const original = [...arr]
    shuffle(arr)
    expect(arr).toEqual(original)
  })

  it('应该返回新数组', () => {
    const arr = [1, 2, 3, 4, 5]
    const shuffled = shuffle(arr)
    expect(shuffled).not.toBe(arr)
  })
})

describe('sum', () => {
  it('应该计算数组和', () => {
    expect(sum([1, 2, 3, 4, 5])).toBe(15)
    expect(sum([10, 20, 30])).toBe(60)
  })
})

describe('average', () => {
  it('应该计算平均值', () => {
    expect(average([1, 2, 3, 4, 5])).toBe(3)
    expect(average([10, 20, 30])).toBe(20)
  })

  it('空数组应该返回0', () => {
    expect(average([])).toBe(0)
  })
})

describe('intersection', () => {
  it('应该返回交集', () => {
    expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3])
  })
})

describe('difference', () => {
  it('应该返回差集', () => {
    expect(difference([1, 2, 3], [2, 3, 4])).toEqual([1])
  })
})

describe('union', () => {
  it('应该返回并集', () => {
    expect(union([1, 2, 3], [2, 3, 4])).toEqual([1, 2, 3, 4])
  })
})

describe('compact', () => {
  it('应该移除假值', () => {
    expect(compact([0, 1, false, 2, '', 3, null, undefined, NaN])).toEqual([
      1, 2, 3,
    ])
  })
})

describe('flatten', () => {
  it('应该扁平化数组', () => {
    expect(flatten([1, [2, [3, [4]]]], 2)).toEqual([1, 2, 3, [4]])
    expect(flatten([1, [2, 3]], 1)).toEqual([1, 2, 3])
  })
})

describe('sample', () => {
  it('应该随机取一个元素', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = sample(arr)
    expect(arr).toContain(result)
  })
})

describe('sampleSize', () => {
  it('应该随机取n个元素', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = sampleSize(arr, 3)
    expect(result).toHaveLength(3)
    result.forEach(item => {
      expect(arr).toContain(item)
    })
  })

  it('n大于数组长度时应该返回所有元素', () => {
    const arr = [1, 2, 3]
    const result = sampleSize(arr, 5)
    expect(result).toHaveLength(3)
  })
})

describe('paginate', () => {
  it('应该分页数组', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7]
    expect(paginate(arr, 1, 3)).toEqual([1, 2, 3])
    expect(paginate(arr, 2, 3)).toEqual([4, 5, 6])
    expect(paginate(arr, 3, 3)).toEqual([7])
  })
})
