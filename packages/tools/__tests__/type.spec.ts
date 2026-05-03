import { describe, expect, it } from 'vitest'
import {
  getType,
  isArray,
  isBigInt,
  isBoolean,
  isDate,
  isEmpty,
  isEqual,
  isError,
  isFalsy,
  isFunction,
  isMap,
  isNil,
  isNull,
  isNumber,
  isObject,
  isPlainObject,
  isPrimitive,
  isPromise,
  isRegExp,
  isSet,
  isString,
  isSymbol,
  isTruthy,
  isUndefined,
  isWeakMap,
  isWeakSet,
} from '../src/type'

describe('getType', () => {
  it('应该返回数据类型', () => {
    expect(getType([])).toBe('Array')
    expect(getType({})).toBe('Object')
    expect(getType(null)).toBe('Null')
    expect(getType(new Map())).toBe('Map')
    expect(getType(new Set())).toBe('Set')
  })
})

describe('isString', () => {
  it('应该判断字符串', () => {
    expect(isString('hello')).toBe(true)
    expect(isString('')).toBe(true)
    expect(isString(123)).toBe(false)
    expect(isString(null)).toBe(false)
  })
})

describe('isNumber', () => {
  it('应该判断数字', () => {
    expect(isNumber(123)).toBe(true)
    expect(isNumber(0)).toBe(true)
    expect(isNumber(-1.5)).toBe(true)
    expect(isNumber(NaN)).toBe(false)
    expect(isNumber(Infinity)).toBe(true)
    expect(isNumber('123')).toBe(false)
  })
})

describe('isBoolean', () => {
  it('应该判断布尔值', () => {
    expect(isBoolean(true)).toBe(true)
    expect(isBoolean(false)).toBe(true)
    expect(isBoolean(1)).toBe(false)
  })
})

describe('isUndefined/isNull/isNil', () => {
  it('应该判断空值', () => {
    expect(isUndefined(undefined)).toBe(true)
    expect(isUndefined(null)).toBe(false)
    expect(isNull(null)).toBe(true)
    expect(isNull(undefined)).toBe(false)
    expect(isNil(null)).toBe(true)
    expect(isNil(undefined)).toBe(true)
    expect(isNil(0)).toBe(false)
    expect(isNil('')).toBe(false)
  })
})

describe('isObject/isPlainObject', () => {
  it('应该判断对象', () => {
    expect(isObject({})).toBe(true)
    expect(isObject([])).toBe(false)
    expect(isObject(null)).toBe(false)
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject(new Date())).toBe(false)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(Object.create(null))).toBe(true)
  })
})

describe('isArray', () => {
  it('应该判断数组', () => {
    expect(isArray([])).toBe(true)
    expect(isArray([1, 2, 3])).toBe(true)
    expect(isArray({})).toBe(false)
    expect(isArray('array')).toBe(false)
  })
})

describe('isFunction', () => {
  it('应该判断函数', () => {
    expect(isFunction(() => {})).toBe(true)
    expect(isFunction(function () {})).toBe(true)
    expect(isFunction({})).toBe(false)
    expect(isFunction('function')).toBe(false)
  })
})

describe('isDate/isRegExp/isError', () => {
  it('应该判断特殊对象', () => {
    expect(isDate(new Date())).toBe(true)
    expect(isDate('2024-01-01')).toBe(false)
    expect(isRegExp(/test/)).toBe(true)
    expect(isRegExp(new RegExp('test'))).toBe(true)
    expect(isError(new Error())).toBe(true)
    expect(isError(new TypeError())).toBe(true)
    expect(isError({})).toBe(false)
  })
})

describe('isPromise', () => {
  it('应该判断Promise', () => {
    expect(isPromise(Promise.resolve())).toBe(true)
    expect(isPromise(new Promise(() => {}))).toBe(true)
    expect(isPromise({})).toBe(false)
    expect(isPromise('promise')).toBe(false)
  })

  it('应该识别thenable对象', () => {
    const thenable = {
      then: () => {},
      catch: () => {},
    }
    expect(isPromise(thenable)).toBe(true)
  })
})

describe('isMap/isSet', () => {
  it('应该判断集合类型', () => {
    expect(isMap(new Map())).toBe(true)
    expect(isMap(new WeakMap())).toBe(false)
    expect(isSet(new Set())).toBe(true)
    expect(isSet(new WeakSet())).toBe(false)
  })
})

describe('isWeakMap/isWeakSet', () => {
  it('应该判断弱引用集合', () => {
    expect(isWeakMap(new WeakMap())).toBe(true)
    expect(isWeakMap(new Map())).toBe(false)
    expect(isWeakSet(new WeakSet())).toBe(true)
    expect(isWeakSet(new Set())).toBe(false)
  })
})

describe('isSymbol', () => {
  it('应该判断Symbol', () => {
    expect(isSymbol(Symbol('test'))).toBe(true)
    expect(isSymbol(Symbol.iterator)).toBe(true)
    expect(isSymbol('symbol')).toBe(false)
    expect(isSymbol(123)).toBe(false)
  })
})

describe('isBigInt', () => {
  it('应该判断BigInt', () => {
    expect(isBigInt(BigInt(123))).toBe(true)
    expect(isBigInt(123)).toBe(false)
    expect(isBigInt('123')).toBe(false)
  })
})

describe('isEmpty', () => {
  it('应该判断空值', () => {
    expect(isEmpty([])).toBe(true)
    expect(isEmpty({})).toBe(true)
    expect(isEmpty('')).toBe(true)
    expect(isEmpty(null)).toBe(true)
    expect(isEmpty(undefined)).toBe(true)
    expect(isEmpty([1])).toBe(false)
    expect(isEmpty({ a: 1 })).toBe(false)
    expect(isEmpty(new Map())).toBe(true)
    expect(isEmpty(new Set())).toBe(true)
  })
})

describe('isPrimitive', () => {
  it('应该判断原始类型', () => {
    expect(isPrimitive(null)).toBe(true)
    expect(isPrimitive(undefined)).toBe(true)
    expect(isPrimitive('string')).toBe(true)
    expect(isPrimitive(123)).toBe(true)
    expect(isPrimitive(true)).toBe(true)
    expect(isPrimitive(Symbol('test'))).toBe(true)
    expect(isPrimitive(BigInt(123))).toBe(true)
    expect(isPrimitive({})).toBe(false)
    expect(isPrimitive([])).toBe(false)
    expect(isPrimitive(() => {})).toBe(false)
  })
})

describe('isFalsy/isTruthy', () => {
  it('应该判断假值', () => {
    expect(isFalsy(false)).toBe(true)
    expect(isFalsy(0)).toBe(true)
    expect(isFalsy('')).toBe(true)
    expect(isFalsy(null)).toBe(true)
    expect(isFalsy(undefined)).toBe(true)
    expect(isFalsy(NaN)).toBe(true)
    expect(isFalsy(true)).toBe(false)
    expect(isFalsy(1)).toBe(false)
  })

  it('应该判断真值', () => {
    expect(isTruthy(true)).toBe(true)
    expect(isTruthy(1)).toBe(true)
    expect(isTruthy('string')).toBe(true)
    expect(isTruthy({})).toBe(true)
    expect(isTruthy([])).toBe(true)
    expect(isTruthy(false)).toBe(false)
    expect(isTruthy(0)).toBe(false)
    expect(isTruthy('')).toBe(false)
  })
})

describe('isEqual', () => {
  it('应该处理原始类型', () => {
    expect(isEqual(1, 1)).toBe(true)
    expect(isEqual('a', 'a')).toBe(true)
    expect(isEqual(true, true)).toBe(true)
    expect(isEqual(1, 2)).toBe(false)
    expect(isEqual('a', 'b')).toBe(false)
  })

  it('应该处理null和undefined', () => {
    expect(isEqual(null, null)).toBe(true)
    expect(isEqual(undefined, undefined)).toBe(true)
    expect(isEqual(null, undefined)).toBe(false)
  })

  it('应该深度比较对象', () => {
    expect(isEqual({ a: 1 }, { a: 1 })).toBe(true)
    expect(isEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(isEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
    expect(isEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
  })

  it('应该深度比较数组', () => {
    expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(isEqual([1, [2, 3]], [1, [2, 3]])).toBe(true)
    expect(isEqual([1, 2], [1, 2, 3])).toBe(false)
  })

  it('应该比较Date对象', () => {
    const date1 = new Date('2024-01-01')
    const date2 = new Date('2024-01-01')
    const date3 = new Date('2024-01-02')
    expect(isEqual(date1, date2)).toBe(true)
    expect(isEqual(date1, date3)).toBe(false)
  })

  it('应该比较正则表达式', () => {
    expect(isEqual(/test/, /test/)).toBe(true)
    expect(isEqual(/test/i, /test/)).toBe(false)
  })

  it('应该处理不同类型', () => {
    expect(isEqual(1, '1')).toBe(false)
    expect(isEqual({}, [])).toBe(false)
  })
})
