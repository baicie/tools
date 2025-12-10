import { plus100 } from '../src/index'
import { expect, it } from 'vitest'

it('should return 100', () => {
  expect(plus100(0)).toBe(100)
})
