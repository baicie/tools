import type { PackageJsonLike, ReleaseConfig, ReleasePackage } from './types'

import { existsSync, readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'

import { readJson } from './fs'

function slash(value: string): string {
  return value.replace(/\\/g, '/')
}

function isIgnored(
  name: string,
  relativeDir: string,
  config: ReleaseConfig,
): boolean {
  const ignore = config.workspace.ignore ?? []

  return ignore.includes(name) || ignore.includes(relativeDir)
}

function isIncluded(name: string, config: ReleaseConfig): boolean {
  const include = config.workspace.include

  if (!include || include.length === 0) return true

  return include.includes(name)
}

export function listWorkspacePackages(config: ReleaseConfig): ReleasePackage[] {
  const cwd = config.cwd ?? process.cwd()
  const packages: ReleasePackage[] = []
  const seen = new Set<string>()

  for (const root of config.workspace.roots) {
    const absoluteRoot = resolve(cwd, root)

    if (!existsSync(absoluteRoot)) continue

    for (const entry of readdirSync(absoluteRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue

      const dir = resolve(absoluteRoot, entry.name)
      const packageJsonPath = resolve(dir, 'package.json')

      if (!existsSync(packageJsonPath)) continue
      if (seen.has(dir)) continue

      const packageJson = readJson<PackageJsonLike>(packageJsonPath)

      if (!packageJson.name) {
        throw new Error(`${packageJsonPath} missing package name`)
      }

      const relativeDir = slash(relative(cwd, dir))

      if (isIgnored(packageJson.name, relativeDir, config)) continue
      if (!isIncluded(packageJson.name, config)) continue

      packages.push({
        name: packageJson.name,
        version: packageJson.version ?? '0.0.0',
        dir,
        relativeDir,
        packageJsonPath,
        packageJson,
        isPrivate: Boolean(packageJson.private),
        kind: config.workspace.packageKind?.(relativeDir, packageJson),
      })

      seen.add(dir)
    }
  }

  return packages.sort((a, b) => {
    if ((a.kind ?? '') !== (b.kind ?? '')) {
      return (a.kind ?? '').localeCompare(b.kind ?? '')
    }

    return a.name.localeCompare(b.name)
  })
}

export function listPublishablePackages(
  config: ReleaseConfig,
): ReleasePackage[] {
  return listWorkspacePackages(config).filter(pkg => !pkg.isPrivate)
}

export function getUniqueVersions(packages: ReleasePackage[]): string[] {
  return Array.from(new Set(packages.map(pkg => pkg.version))).sort()
}

export function getSharedVersion(config: ReleaseConfig): string {
  const versions = getUniqueVersions(listPublishablePackages(config))

  if (versions.length !== 1) {
    throw new Error(
      `Expected one shared version. Found: ${versions.join(', ')}`,
    )
  }

  return versions[0]
}
