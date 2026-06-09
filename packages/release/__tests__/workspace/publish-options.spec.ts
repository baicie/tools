import { describe, expect, it } from 'vitest'
import { parsePublishArgs } from '../../src/workspace/publish'

describe('parsePublishArgs', () => {
  it('defaults to dryRun false without CLI defaults for skipExisting/provenance', () => {
    const result = parsePublishArgs([])
    expect(result.dryRun).toBe(false)
    expect(result.skipExisting).toBeUndefined()
    expect(result.provenance).toBeUndefined()
  })

  it('sets dryRun true with --dry', () => {
    expect(parsePublishArgs(['--dry']).dryRun).toBe(true)
    expect(parsePublishArgs(['--dry-run']).dryRun).toBe(true)
  })

  it('sets skipExisting with --skip-existing', () => {
    const result = parsePublishArgs(['--skip-existing'])
    expect(result.skipExisting).toBe(true)
  })

  it('sets skipExisting false with --no-skip-existing', () => {
    const result = parsePublishArgs(['--no-skip-existing'])
    expect(result.skipExisting).toBe(false)
  })

  it('sets provenance with --provenance', () => {
    const result = parsePublishArgs(['--provenance'])
    expect(result.provenance).toBe(true)
  })

  it('sets provenance false with --no-provenance', () => {
    const result = parsePublishArgs(['--no-provenance'])
    expect(result.provenance).toBe(false)
  })

  it('parses --tag value', () => {
    expect(parsePublishArgs(['--tag', 'beta']).tag).toBe('beta')
    expect(parsePublishArgs(['--tag=beta']).tag).toBe('beta')
  })

  it('parses --version value', () => {
    expect(parsePublishArgs(['--version', '1.2.3']).version).toBe('1.2.3')
    expect(parsePublishArgs(['--version=1.2.3']).version).toBe('1.2.3')
  })

  it('parses --registry value', () => {
    expect(
      parsePublishArgs(['--registry', 'https://npm.example.com']).registry,
    ).toBe('https://npm.example.com')
    expect(
      parsePublishArgs(['--registry=https://npm.example.com']).registry,
    ).toBe('https://npm.example.com')
  })

  it('parses --registry with query string (equal sign in value)', () => {
    const result = parsePublishArgs([
      '--registry',
      'https://registry.npmmirror.com?token=abc123',
    ])
    expect(result.registry).toBe('https://registry.npmmirror.com?token=abc123')
  })

  it('combines multiple flags', () => {
    const result = parsePublishArgs([
      '--dry',
      '--no-skip-existing',
      '--no-provenance',
      '--tag',
      'next',
    ])

    expect(result.dryRun).toBe(true)
    expect(result.skipExisting).toBe(false)
    expect(result.provenance).toBe(false)
    expect(result.tag).toBe('next')
  })

  it('throws on unknown option', () => {
    expect(() => parsePublishArgs(['--unknown'])).toThrow(
      'Unknown option: --unknown',
    )
  })

  it('throws when --tag has no value', () => {
    expect(() => parsePublishArgs(['--tag'])).toThrow('--tag requires a value')
  })
})
