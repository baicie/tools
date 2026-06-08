import type { ReleaseConfig } from './types'

import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import semver from 'semver'

import { readJson, writeJson } from './fs'
import { run } from './exec'
import { listPublishablePackages } from './packages'
import type { PackageJsonLike } from './types'

function getBumpType(
  current: string,
  target: string,
): 'major' | 'minor' | 'patch' {
  const currentParsed = semver.parse(current)
  const targetParsed = semver.parse(target)

  if (!currentParsed || !targetParsed) return 'patch'
  if (targetParsed.major > currentParsed.major) return 'major'
  if (targetParsed.minor > currentParsed.minor) return 'minor'
  return 'patch'
}

export async function runChangesetsFixedVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  const cwd = config.cwd ?? process.cwd()
  const packages = listPublishablePackages(config)
  const fixed = config.fixedPackages ?? packages.map(pkg => pkg.name)
  const rootPackage =
    packages.find(pkg => pkg.name === config.rootVersionPackage) ?? packages[0]

  if (!rootPackage) {
    throw new Error('No package found for changesets release')
  }

  const bump = getBumpType(rootPackage.version, version)
  const changesetFile = resolve(
    cwd,
    config.changesetFile ?? '.changeset/release.md',
  )

  await mkdir(dirname(changesetFile), { recursive: true })

  const body = [
    '---',
    ...fixed.map(name => `"${name}": ${bump}`),
    '---',
    '',
    `Release v${version}`,
    '',
  ].join('\n')

  writeFileSync(changesetFile, body)

  await run(config.packageManager ?? 'pnpm', ['changeset', 'version'], {
    cwd,
  })

  await forceWorkspaceVersion(config, version)
  cleanupGeneratedReleaseFiles(config, changesetFile)
}

export async function forceWorkspaceVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  for (const pkg of listPublishablePackages(config)) {
    const json = readJson<PackageJsonLike>(pkg.packageJsonPath)

    json.version = version

    await writeJson(pkg.packageJsonPath, json)
  }
}

function cleanupGeneratedReleaseFiles(
  config: ReleaseConfig,
  changesetFile: string,
): void {
  for (const pkg of listPublishablePackages(config)) {
    const changelog = resolve(pkg.dir, 'CHANGELOG.md')

    if (existsSync(changelog)) {
      rmSync(changelog)
    }
  }

  if (existsSync(changesetFile)) {
    rmSync(changesetFile)
  }
}
