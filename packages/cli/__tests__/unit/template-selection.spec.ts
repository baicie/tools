import { beforeEach, describe, expect, it, vi } from 'vitest'

import { askTemplate } from '../../src/steps'

const mocks = vi.hoisted(() => ({
  autocomplete: vi.fn(),
  select: vi.fn(),
}))

vi.mock('@clack/prompts', () => ({
  autocomplete: mocks.autocomplete,
  confirm: vi.fn(),
  select: mocks.select,
  text: vi.fn(),
}))

describe('askTemplate', () => {
  beforeEach(() => {
    mocks.autocomplete.mockReset()
    mocks.select.mockReset()
  })

  it('filters invalid template entries before rendering choices', async () => {
    mocks.autocomplete.mockResolvedValue('vue')

    const value = await askTemplate([
      undefined,
      { name: '' },
      { name: 'vue', desc: 'Vue template' },
    ] as never)

    expect(value).toBe('vue')
    expect(mocks.autocomplete).toHaveBeenCalledTimes(1)
    expect(mocks.autocomplete.mock.calls[0][0].options).toHaveLength(2)
    expect(mocks.autocomplete.mock.calls[0][0].options[0].value).toBe('default')
    expect(mocks.autocomplete.mock.calls[0][0].options[1]).toEqual({
      label: 'vue（Vue template）',
      value: 'vue',
    })
  })

  it('searches templates by name and description', async () => {
    mocks.autocomplete.mockResolvedValue('react')

    await askTemplate([
      { name: 'vue', desc: 'Vue template' },
      { name: 'react', desc: 'Web app template' },
    ])

    const filter = mocks.autocomplete.mock.calls[0][0].filter

    expect(
      filter('react', {
        label: 'react（Web app template）',
        value: 'react',
      }),
    ).toBe(true)
    expect(
      filter('web app', {
        label: 'react（Web app template）',
        value: 'react',
      }),
    ).toBe(true)
    expect(
      filter('svelte', {
        label: 'react（Web app template）',
        value: 'react',
      }),
    ).toBe(false)
  })
})
