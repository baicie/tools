import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import type { ReleaseConfig } from '../../src/workspace/types'
import { parseVersionCliArgs } from '../../src/workspace/version'

function createTempDir(): string {
  const dir = join(tmpdir(), 'release-test-version-' + Date.now())
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('parseVersionCliArgs', () => {
  it('parses version with --dry', () => {
    expect(parseVersionCliArgs(['1.0.0', '--dry'])).toEqual({
      version: '1.0.0',
      dryRun: true,
    })
    expect(parseVersionCliArgs(['1.0.0', '--dry-run'])).toEqual({
      version: '1.0.0',
      dryRun: true,
    })
  })

  it('parses version without dry-run flag', () => {
    expect(parseVersionCliArgs(['1.0.0'])).toEqual({
      version: '1.0.0',
      dryRun: false,
    })
  })

  it('parses version with prerelease preid', () => {
    expect(parseVersionCliArgs(['1.0.0-beta.5'])).toEqual({
      version: '1.0.0-beta.5',
      dryRun: false,
    })
  })

  it('throws on unknown flag', () => {
    expect(() => parseVersionCliArgs(['1.0.0', '--unknown'])).toThrow(
      'Unknown option: --unknown',
    )
  })

  it('throws when version is missing', () => {
    expect(() => parseVersionCliArgs([])).toThrow(
      'Usage: version:packages <version> [--dry-run]',
    )
    expect(() => parseVersionCliArgs(['--dry'])).toThrow(
      'Usage: version:packages <version> [--dry-run]',
    )
  })

  it('throws on unexpected extra positional argument', () => {
    expect(() => parseVersionCliArgs(['1.0.0', 'extra'])).toThrow(
      'Unexpected argument: extra',
    )
  })
})

describe('versionPackages dry-run', () => {
  let config: ReleaseConfig
  let dir: string

  beforeEach(() => {
    dir = createTempDir()

    const pkgJson = {
      name: '@test/monorepo',
      version: '0.0.1',
      private: true,
      workspaces: { packages: ['packages/*'] },
    }
    writeFileSync(join(dir, 'package.json'), JSON.stringify(pkgJson, null, 2))

    const packagesDir = join(dir, 'packages')
    mkdirSync(packagesDir, { recursive: true })

    const subPkgJson = {
      name: '@test/pkg',
      version: '0.0.1',
    }
    writeFileSync(
      join(packagesDir, 'package.json'),
      JSON.stringify(subPkgJson, null, 2),
    )
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('does not call afterVersion in dry-run mode', async () => {
    const afterVersion = vi.fn()

    config = {
      repo: 'baicie/test',
      repositoryUrl: 'https://github.com/baicie/test.git',
      mode: 'workspace-fixed',
      cwd: dir,
      workspace: {
        roots: [join(dir, 'packages')],
      },
      afterVersion,
    }

    const { versionPackages } = await import('../../src/workspace/version')

    await versionPackages(config, {
      version: '1.0.0',
      dryRun: true,
    })

    expect(afterVersion).not.toHaveBeenCalled()
  })

  it('does not call afterVersion when workspace has no packages', async () => {
    const afterVersion = vi.fn()

    config = {
      repo: 'baicie/test',
      repositoryUrl: 'https://github.com/baicie/test.git',
      mode: 'workspace-fixed',
      cwd: dir,
      workspace: {
        roots: [join(dir, 'packages')],
      },
      afterVersion,
    }

    const { versionPackages } = await import('../../src/workspace/version')

    await versionPackages(config, {
      version: '1.0.0',
      dryRun: false,
    })

    expect(afterVersion).toHaveBeenCalledTimes(1)
    expect(afterVersion).toHaveBeenCalledWith({
      version: '1.0.0',
      config,
    })
  })
})
