import { beforeEach, describe, expect, it, vi } from 'vitest'

import { askTemplate } from '../../src/steps'

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
}))

vi.mock('@clack/prompts', () => ({
  confirm: vi.fn(),
  select: mocks.select,
  text: vi.fn(),
}))

describe('askTemplate', () => {
  beforeEach(() => {
    mocks.select.mockReset()
  })

  it('filters invalid template entries before rendering choices', async () => {
    mocks.select.mockResolvedValue('vue')

    const value = await askTemplate([
      undefined,
      { name: '' },
      { name: 'vue', desc: 'Vue template' },
    ] as never)

    expect(value).toBe('vue')
    expect(mocks.select).toHaveBeenCalledTimes(1)
    expect(mocks.select.mock.calls[0][0].options).toHaveLength(2)
    expect(mocks.select.mock.calls[0][0].options[0].value).toBe('default')
    expect(mocks.select.mock.calls[0][0].options[1]).toEqual({
      label: 'vue（Vue template）',
      value: 'vue',
    })
  })
})
