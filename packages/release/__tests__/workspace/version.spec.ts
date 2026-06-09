import { describe, expect, it, vi } from 'vitest'

import type { ReleaseConfig } from '../../src/workspace/types'

import {
  parseVersionCliArgs,
  versionPackages,
} from '../../src/workspace/version'

describe('parseVersionCliArgs', () => {
  it('parses version without dry-run', () => {
    expect(parseVersionCliArgs(['1.0.0'])).toEqual({
      version: '1.0.0',
      dryRun: false,
    })
  })

  it('parses dry-run aliases', () => {
    expect(parseVersionCliArgs(['1.0.0', '--dry'])).toEqual({
      version: '1.0.0',
      dryRun: true,
    })

    expect(parseVersionCliArgs(['1.0.0', '--dry-run'])).toEqual({
      version: '1.0.0',
      dryRun: true,
    })
  })

  it('requires a version', () => {
    expect(() => parseVersionCliArgs([])).toThrow(
      'Usage: version:packages <version> [--dry-run]',
    )
  })

  it('rejects unknown options', () => {
    expect(() => parseVersionCliArgs(['1.0.0', '--bad'])).toThrow(
      'Unknown option: --bad',
    )
  })
})

describe('versionPackages', () => {
  it('does not call afterVersion in dry-run mode', async () => {
    const afterVersion = vi.fn()

    const config: ReleaseConfig = {
      repo: 'baicie/test',
      repositoryUrl: 'https://github.com/baicie/test.git',
      mode: 'workspace-fixed',
      cwd: process.cwd(),
      workspace: {
        roots: ['__not_exists__'],
      },
      afterVersion,
    }

    await versionPackages(config, {
      version: '1.0.0',
      dryRun: true,
    })

    expect(afterVersion).not.toHaveBeenCalled()
  })
})
