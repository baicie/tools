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

  it('does not call app.json sync in dry-run mode', async () => {
    const syncSpy = vi
      .spyOn(await import('../../src/workspace/appjson'), 'syncAppJsonVersion')
      .mockImplementation(async () => ({
        changed: false,
        appJson: null,
        filePath: '',
        versionName: '',
        versionCode: undefined,
        dryRun: true,
      }))

    const config: ReleaseConfig = {
      repo: 'baicie/test',
      repositoryUrl: 'https://github.com/baicie/test.git',
      mode: 'workspace-fixed',
      cwd: process.cwd(),
      workspace: { roots: ['__not_exists__'] },
      appJson: { enabled: true },
    }

    await versionPackages(config, { version: '1.0.0', dryRun: true })

    expect(syncSpy).not.toHaveBeenCalled()
    syncSpy.mockRestore()
  })

  it('invokes app.json sync when not in dry-run mode', async () => {
    const syncSpy = vi
      .spyOn(
        await import('../../src/workspace/appjson'),
        'runAppJsonSyncFromConfig',
      )
      .mockResolvedValue({
        changed: true,
        appJson: { expo: { version: '1.2.3' } },
        filePath: '/x/app.json',
        versionName: '1.2.3',
        versionCode: undefined,
        dryRun: false,
      })

    const afterVersion = vi.fn()

    const config: ReleaseConfig = {
      repo: 'baicie/test',
      repositoryUrl: 'https://github.com/baicie/test.git',
      mode: 'workspace-fixed',
      cwd: process.cwd(),
      workspace: { roots: ['__not_exists__'] },
      appJson: { enabled: true },
      afterVersion,
    }

    await versionPackages(config, { version: '1.2.3', dryRun: false })

    expect(syncSpy).toHaveBeenCalledTimes(1)
    expect(syncSpy).toHaveBeenCalledWith(config, '1.2.3', false)
    // afterVersion still runs after sync
    expect(afterVersion).toHaveBeenCalledTimes(1)

    syncSpy.mockRestore()
  })

  it('still calls runAppJsonSyncFromConfig (which short-circuits) when appJson config is absent', async () => {
    const syncSpy = vi
      .spyOn(
        await import('../../src/workspace/appjson'),
        'runAppJsonSyncFromConfig',
      )
      .mockResolvedValue({
        changed: false,
        appJson: null,
        filePath: '',
        versionName: '',
        versionCode: undefined,
        dryRun: false,
      })

    const config: ReleaseConfig = {
      repo: 'baicie/test',
      repositoryUrl: 'https://github.com/baicie/test.git',
      mode: 'workspace-fixed',
      cwd: process.cwd(),
      workspace: { roots: ['__not_exists__'] },
    }

    await versionPackages(config, { version: '1.0.0', dryRun: false })

    expect(syncSpy).toHaveBeenCalledTimes(1)
    expect(syncSpy.mock.calls[0]?.[0]).toBe(config)
    expect(syncSpy.mock.calls[0]?.[2] as boolean).toBe(false)

    syncSpy.mockRestore()
  })

  it('propagates app.json sync errors', async () => {
    vi.spyOn(
      await import('../../src/workspace/appjson'),
      'runAppJsonSyncFromConfig',
    ).mockRejectedValue(new Error('app.json exploded'))

    const config: ReleaseConfig = {
      repo: 'baicie/test',
      repositoryUrl: 'https://github.com/baicie/test.git',
      mode: 'workspace-fixed',
      cwd: process.cwd(),
      workspace: { roots: ['__not_exists__'] },
      appJson: { enabled: true },
    }

    await expect(
      versionPackages(config, { version: '1.0.0', dryRun: false }),
    ).rejects.toThrow(/app.json exploded/)

    vi.restoreAllMocks()
  })
})
