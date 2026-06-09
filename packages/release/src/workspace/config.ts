import type { ReleaseConfig } from './types'

export function defineReleaseConfig(config: ReleaseConfig): ReleaseConfig {
  return {
    ...config,
    packageManager: config.packageManager ?? 'pnpm',
    rootPackageJson:
      config.rootPackageJson === undefined
        ? 'package.json'
        : config.rootPackageJson,
    changelogFile:
      config.changelogFile === undefined
        ? 'CHANGELOG.md'
        : config.changelogFile,
    changesets: {
      configFile: '.changeset/config.json',
      releaseFile: config.changesetFile ?? '.changeset/release.md',
      requireChangeset: false,
      readIgnore: true,
      readFixed: true,
      cleanupPackageChangelogs: true,
      unifiedChangelog: true,
      ...(config.changesets ?? {}),
    },
    publish: {
      access: 'public',
      provenance: true,
      skipExisting: true,
      retry: 5,
      ...(config.publish ?? {}),
    },
    precheck: {
      commands: [],
      verifyCommand: false,
      ...(config.precheck ?? {}),
    },
    readiness: {
      common: true,
      allowZero: false,
      strict: false,
      ...(config.readiness ?? {}),
    },
  }
}
