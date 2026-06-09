import { describe, expect, it } from 'vitest'
import { defineReleaseConfig } from '../../src/workspace/config'

const MINIMAL_CONFIG = {
  repo: 'baicie/example',
  repositoryUrl: 'https://github.com/baicie/example.git',
  mode: 'changesets-fixed' as const,
  workspace: {
    roots: ['packages'],
  },
}

describe('defineReleaseConfig', () => {
  it('fills defaults when all optional fields are omitted', () => {
    const config = defineReleaseConfig(MINIMAL_CONFIG)

    expect(config.packageManager).toBe('pnpm')
    expect(config.rootPackageJson).toBe('package.json')
    expect(config.changelogFile).toBe('CHANGELOG.md')

    expect(config.changesets).toMatchObject({
      configFile: '.changeset/config.json',
      releaseFile: '.changeset/release.md',
      requireChangeset: false,
      readIgnore: true,
      readFixed: true,
      cleanupPackageChangelogs: true,
      unifiedChangelog: true,
    })

    expect(config.publish).toMatchObject({
      access: 'public',
      provenance: true,
      skipExisting: true,
      retry: 5,
    })

    expect(config.precheck).toMatchObject({
      commands: [],
      verifyCommand: false,
    })

    expect(config.readiness).toMatchObject({
      common: true,
      allowZero: false,
      strict: false,
    })
  })

  it('allows user overrides in publish config', () => {
    const config = defineReleaseConfig({
      ...MINIMAL_CONFIG,
      publish: {
        access: 'restricted' as const,
        provenance: false,
        skipExisting: false,
        retry: 3,
      },
    })

    expect(config.publish).toMatchObject({
      access: 'restricted',
      provenance: false,
      skipExisting: false,
      retry: 3,
    })
  })

  it('merges partial changesets config without losing defaults', () => {
    const config = defineReleaseConfig({
      ...MINIMAL_CONFIG,
      changesets: {
        requireChangeset: true,
        releaseFile: '.changeset/my-release.md',
      },
    })

    expect(config.changesets).toMatchObject({
      configFile: '.changeset/config.json',
      releaseFile: '.changeset/my-release.md',
      requireChangeset: true,
      readIgnore: true,
      readFixed: true,
      cleanupPackageChangelogs: true,
      unifiedChangelog: true,
    })
  })

  it('preserves rootPackageJson: false', () => {
    const config = defineReleaseConfig({
      ...MINIMAL_CONFIG,
      rootPackageJson: false,
    })

    expect(config.rootPackageJson).toBe(false)
  })

  it('preserves changelogFile: false', () => {
    const config = defineReleaseConfig({
      ...MINIMAL_CONFIG,
      changelogFile: false,
    })

    expect(config.changelogFile).toBe(false)
  })

  it('preserves verifyCommand: false', () => {
    const config = defineReleaseConfig({
      ...MINIMAL_CONFIG,
      precheck: {
        verifyCommand: false,
      },
    })

    expect(config.precheck?.verifyCommand).toBe(false)
  })

  it('uses user-specified packageManager', () => {
    const config = defineReleaseConfig({
      ...MINIMAL_CONFIG,
      packageManager: 'npm',
    })

    expect(config.packageManager).toBe('npm')
  })

  it('preserves readiness partial overrides', () => {
    const config = defineReleaseConfig({
      ...MINIMAL_CONFIG,
      readiness: {
        strict: true,
      },
    })

    expect(config.readiness).toMatchObject({
      common: true,
      allowZero: false,
      strict: true,
    })
  })

  it('uses changesetFile as fallback for releaseFile when changesets config absent', () => {
    const config = defineReleaseConfig({
      ...MINIMAL_CONFIG,
      changesetFile: '.changeset/my-release.md',
    })

    expect(config.changesets?.releaseFile).toBe('.changeset/my-release.md')
  })
})
