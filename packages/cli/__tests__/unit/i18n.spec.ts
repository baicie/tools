import { afterEach, describe, expect, it } from 'vitest'

import { resolveLocale, setLocale, t } from '../../src/util/i18n'

describe('i18n', () => {
  afterEach(() => {
    setLocale('en-US')
  })

  it.each([
    ['zh-CN', 'zh-CN'],
    ['zh-Hans-CN', 'zh-CN'],
    ['zh-TW', 'zh-CN'],
    ['en-US', 'en-US'],
    ['ja-JP', 'en-US'],
  ] as const)('maps %s to %s', (systemLocale, expected) => {
    expect(resolveLocale(systemLocale)).toBe(expected)
  })

  it('interpolates English messages', () => {
    setLocale('en-US')

    expect(t('exists.message', { dir: 'demo' })).toBe(
      'demo already exists. What to do?',
    )
  })

  it('interpolates Chinese error details', () => {
    setLocale('zh-CN')

    expect(t('errors.createFailed', { reason: '网络错误' })).toBe(
      '创建项目失败：网络错误',
    )
    expect(t('errors.pkgFailed', { reason: '格式错误' })).toBe(
      '处理 package.json 失败：格式错误',
    )
    expect(t('errors.templateNotFound', { sourcePath: '/tmp/template' })).toBe(
      '找不到模板：/tmp/template',
    )
  })
})
