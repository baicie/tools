import { describe, expect, it } from 'vitest'

import { parsePublishArgs } from '../../src/workspace/publish'

describe('parsePublishArgs', () => {
  it('does not force optional publish defaults', () => {
    expect(parsePublishArgs([])).toEqual({
      dryRun: false,
    })
  })

  it('parses dry-run aliases', () => {
    expect(parsePublishArgs(['--dry'])).toEqual({
      dryRun: true,
    })

    expect(parsePublishArgs(['--dry-run'])).toEqual({
      dryRun: true,
    })
  })

  it('parses skipExisting overrides', () => {
    expect(parsePublishArgs(['--skip-existing'])).toEqual({
      dryRun: false,
      skipExisting: true,
    })

    expect(parsePublishArgs(['--no-skip-existing'])).toEqual({
      dryRun: false,
      skipExisting: false,
    })
  })

  it('parses provenance overrides', () => {
    expect(parsePublishArgs(['--provenance'])).toEqual({
      dryRun: false,
      provenance: true,
    })

    expect(parsePublishArgs(['--no-provenance'])).toEqual({
      dryRun: false,
      provenance: false,
    })
  })

  it('parses tag version and registry', () => {
    expect(
      parsePublishArgs([
        '--tag',
        'beta',
        '--version',
        '1.0.0-beta.1',
        '--registry',
        'https://registry.npmjs.org/',
      ]),
    ).toEqual({
      dryRun: false,
      tag: 'beta',
      version: '1.0.0-beta.1',
      registry: 'https://registry.npmjs.org/',
    })
  })

  it('rejects unknown options', () => {
    expect(() => parsePublishArgs(['--bad'])).toThrow('Unknown option: --bad')
  })
})
