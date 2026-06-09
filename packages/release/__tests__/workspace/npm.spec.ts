import { describe, expect, it } from 'vitest'
import { resolveDistTag } from '../../src/workspace/npm'

describe('resolveDistTag', () => {
  it('returns latest for stable versions', () => {
    expect(resolveDistTag('1.0.0')).toBe('latest')
    expect(resolveDistTag('2.3.4')).toBe('latest')
    expect(resolveDistTag('10.20.30')).toBe('latest')
  })

  it('returns alpha for versions containing alpha', () => {
    expect(resolveDistTag('1.0.0-alpha.1')).toBe('alpha')
    expect(resolveDistTag('2.0.0-alpha')).toBe('alpha')
    expect(resolveDistTag('1.0.0-alpha.1+build.123')).toBe('alpha')
  })

  it('returns beta for versions containing beta', () => {
    expect(resolveDistTag('1.0.0-beta.1')).toBe('beta')
    expect(resolveDistTag('2.0.0-beta')).toBe('beta')
    expect(resolveDistTag('1.0.0-beta.2+build.456')).toBe('beta')
  })

  it('returns rc for versions containing rc', () => {
    expect(resolveDistTag('1.0.0-rc.1')).toBe('rc')
    expect(resolveDistTag('2.0.0-rc')).toBe('rc')
    expect(resolveDistTag('1.0.0-rc.3+build.789')).toBe('rc')
  })

  it('returns canary for versions containing canary', () => {
    expect(resolveDistTag('1.0.0-canary.20260601.1.1.abc123')).toBe('canary')
    expect(resolveDistTag('2.0.0-canary')).toBe('canary')
  })

  it('prioritizes canary over other prerelease identifiers', () => {
    expect(resolveDistTag('1.0.0-canary.20260601.1.1.abc123')).toBe('canary')
    expect(resolveDistTag('1.0.0-canary.1')).toBe('canary')
  })

  it('uses explicit tag when provided', () => {
    expect(resolveDistTag('1.0.0', 'next')).toBe('next')
    expect(resolveDistTag('1.0.0-beta.1', 'latest')).toBe('latest')
    expect(resolveDistTag('1.0.0-alpha.1', 'custom')).toBe('custom')
  })

  it('prioritzes canary check over alpha when both match', () => {
    expect(resolveDistTag('1.0.0-canary.alpha')).toBe('canary')
  })
})
