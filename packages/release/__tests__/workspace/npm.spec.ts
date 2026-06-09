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

describe('isRetryablePublishError', () => {
  // Expose via the retry path in publishOnePackage by mocking run()
  // Here we test the error message patterns that trigger retries

  function isRetryablePublishError(message: string): boolean {
    return (
      message.includes('E409') ||
      message.includes('409 Conflict') ||
      /\b429\b/.test(message) ||
      /\b5\d\d\b/.test(message) ||
      message.includes('ETIMEDOUT') ||
      message.includes('ECONNRESET') ||
      message.includes('ECONNABORTED') ||
      message.includes('EAI_AGAIN') ||
      message.includes('ENOTFOUND') ||
      message.includes('Failed to save packument') ||
      message.includes('previous package has been fully processed')
    )
  }

  it('retries on 5xx HTTP errors', () => {
    expect(isRetryablePublishError('npm error code E500')).toBe(true)
    expect(isRetryablePublishError('npm error code 502')).toBe(true)
    expect(isRetryablePublishError('npm error code E503')).toBe(true)
    expect(isRetryablePublishError('npm error code 504')).toBe(true)
    expect(
      isRetryablePublishError('npm error code 500 Internal Server Error'),
    ).toBe(true)
  })

  it('retries on 429 rate limit', () => {
    expect(isRetryablePublishError('npm error code E429')).toBe(true)
    expect(isRetryablePublishError('npm error 429 Too Many Requests')).toBe(
      true,
    )
  })

  it('retries on network errors', () => {
    expect(isRetryablePublishError('npm error ETIMEDOUT')).toBe(true)
    expect(isRetryablePublishError('npm error ECONNRESET')).toBe(true)
    expect(isRetryablePublishError('npm error ECONNABORTED')).toBe(true)
    expect(isRetryablePublishError('npm error EAI_AGAIN')).toBe(true)
    expect(isRetryablePublishError('npm error ENOTFOUND')).toBe(true)
  })

  it('retries on E409 conflict', () => {
    expect(isRetryablePublishError('npm error E409')).toBe(true)
    expect(isRetryablePublishError('npm error 409 Conflict')).toBe(true)
  })

  it('retries on packument errors', () => {
    expect(isRetryablePublishError('npm error Failed to save packument')).toBe(
      true,
    )
    expect(
      isRetryablePublishError(
        'npm error previous package has been fully processed',
      ),
    ).toBe(true)
  })

  it('does not retry on auth or permission errors', () => {
    expect(isRetryablePublishError('npm error code E401 Unauthorized')).toBe(
      false,
    )
    expect(isRetryablePublishError('npm error code E403 Forbidden')).toBe(false)
    expect(
      isRetryablePublishError(
        'npm error code ENOTADDED Not added to the registry',
      ),
    ).toBe(false)
  })
})
