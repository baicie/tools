import type {
  PackageJsonLike,
  ParsedChangeset,
  ParsedChangesetRelease,
  ReleaseConfig,
} from './types'

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'

import semver from 'semver'

import { readJson, writeJson } from './fs'
import { run } from './exec'
import { generateUnifiedChangelog } from './changelog'
import { listPublishablePackages, listWorkspacePackages } from './packages'
import { normalizePackageJson, updateRootPackageVersion } from './version'
import { getChangesetsFixedPackages } from './config-changesets'

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

function parseChangesetFrontmatter(value: string): {
  releases: ParsedChangesetRelease[]
  summary: string
} | null {
  const match = value.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)

  if (!match) {
    return null
  }

  const [, frontmatter, body] = match
  const releases: ParsedChangesetRelease[] = []

  for (const rawLine of frontmatter.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const release = line.match(/^['"]?(.+?)['"]?:\s*(major|minor|patch|none)$/)

    if (!release) {
      continue
    }

    releases.push({
      name: release[1],
      type: release[2] as ParsedChangesetRelease['type'],
    })
  }

  return {
    releases,
    summary: body.trim(),
  }
}

export function readChangesets(config: ReleaseConfig): ParsedChangeset[] {
  const cwd = config.cwd ?? process.cwd()
  const dir = resolve(cwd, '.changeset')

  if (!existsSync(dir)) {
    return []
  }

  const releaseFile = resolve(
    cwd,
    config.changesets?.releaseFile ??
      config.changesetFile ??
      '.changeset/release.md',
  )

  return readdirSync(dir)
    .filter(file => file.endsWith('.md'))
    .filter(file => file !== 'README.md')
    .map(file => resolve(dir, file))
    .filter(file => file !== releaseFile)
    .map(file => {
      const content = readFileSync(file, 'utf-8')
      const parsed = parseChangesetFrontmatter(content)

      if (!parsed) {
        return undefined
      }

      return {
        id: file.split(/[\\/]/).pop()!.replace(/\.md$/, ''),
        file,
        ...parsed,
      }
    })
    .filter(Boolean) as ParsedChangeset[]
}

function createSyntheticReleaseChangeset(
  config: ReleaseConfig,
  version: string,
): string {
  const cwd = config.cwd ?? process.cwd()
  const packages = listPublishablePackages(config)
  const publishableNames = new Set(packages.map(pkg => pkg.name))
  const fixed = getChangesetsFixedPackages(config).filter(name =>
    publishableNames.has(name),
  )

  const fixedPackages = fixed.length ? fixed : packages.map(pkg => pkg.name)
  const rootPackage =
    packages.find(pkg => pkg.name === config.rootVersionPackage) ?? packages[0]

  if (!rootPackage) {
    throw new Error('No package found for changesets release.')
  }

  const bump = getBumpType(rootPackage.version, version)

  const changesetFile = resolve(
    cwd,
    config.changesets?.releaseFile ??
      config.changesetFile ??
      '.changeset/release.md',
  )

  const body = [
    '---',
    ...fixedPackages.map(name => `"${name}": ${bump}`),
    '---',
    '',
    `Release v${version}`,
    '',
  ].join('\n')

  mkdirSync(dirname(changesetFile), { recursive: true })
  writeFileSync(changesetFile, body)

  return changesetFile
}

async function forceFixedGroupVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  const fixed = getChangesetsFixedPackages(config)

  if (!fixed.length) {
    return
  }

  const fixedSet = new Set(fixed)

  for (const pkg of listWorkspacePackages(config)) {
    if (!fixedSet.has(pkg.name)) continue

    const json = readJson<PackageJsonLike>(pkg.packageJsonPath)
    json.version = version

    await writeJson(
      pkg.packageJsonPath,
      normalizePackageJson(json, {
        config,
        releasePackage: pkg,
        version,
      }),
    )
  }
}

async function normalizePublishablePackages(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  for (const releasePackage of listPublishablePackages(config)) {
    const current = readJson<PackageJsonLike>(releasePackage.packageJsonPath)

    const next = config.versionPackage
      ? config.versionPackage(current, {
          version,
          releasePackage,
          config,
        })
      : normalizePackageJson(
          {
            ...current,
            version,
          },
          {
            version,
            releasePackage,
            config,
          },
        )

    await writeJson(releasePackage.packageJsonPath, next)
  }
}

function cleanupGeneratedReleaseFiles(
  config: ReleaseConfig,
  syntheticChangesetFile: string,
): void {
  if (config.changesets?.cleanupPackageChangelogs !== false) {
    for (const pkg of listWorkspacePackages(config)) {
      const changelog = resolve(pkg.dir, 'CHANGELOG.md')

      if (existsSync(changelog)) {
        rmSync(changelog)
      }
    }
  }

  if (existsSync(syntheticChangesetFile)) {
    rmSync(syntheticChangesetFile)
  }
}

export async function runChangesetsFixedVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  const changesets = readChangesets(config)

  if (
    (config.changesets?.requireChangeset ?? false) &&
    changesets.length === 0
  ) {
    throw new Error('No changeset found. Run `pnpm changeset` before release.')
  }

  const syntheticChangesetFile = createSyntheticReleaseChangeset(
    config,
    version,
  )

  await run(config.packageManager ?? 'pnpm', ['changeset', 'version'], {
    cwd: config.cwd,
  })

  await forceFixedGroupVersion(config, version)
  await normalizePublishablePackages(config, version)
  await updateRootPackageVersion(config, version)

  if (
    config.changelogFile !== false &&
    config.changesets?.unifiedChangelog !== false
  ) {
    await generateUnifiedChangelog(config, version, changesets)
  }

  cleanupGeneratedReleaseFiles(config, syntheticChangesetFile)

  await config.afterVersion?.({
    version,
    config,
  })
}
