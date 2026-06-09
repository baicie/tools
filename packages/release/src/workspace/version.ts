import type {
  PackageJsonLike,
  ReleaseConfig,
  ReleasePackage,
  VersionPackagesOptions,
} from './types'

import { resolve } from 'node:path'

import { existsSync } from 'node:fs'

import semver from 'semver'

import { readJson, writeJson } from './fs'
import { listPublishablePackages } from './packages'

function sortPackageJson(pkg: PackageJsonLike): PackageJsonLike {
  const preferred = [
    'name',
    'type',
    'version',
    'description',
    'license',
    'repository',
    'publishConfig',
    'sideEffects',
    'exports',
    'bin',
    'files',
    'scripts',
    'peerDependencies',
    'peerDependenciesMeta',
    'dependencies',
    'devDependencies',
    'optionalDependencies',
  ]

  const result: PackageJsonLike = {}

  for (const key of preferred) {
    if (key in pkg) result[key] = pkg[key]
  }

  for (const key of Object.keys(pkg).sort()) {
    if (!(key in result)) result[key] = pkg[key]
  }

  return result
}

export function normalizePackageJson(
  pkg: PackageJsonLike,
  ctx: {
    version: string
    releasePackage: ReleasePackage
    config: ReleaseConfig
  },
): PackageJsonLike {
  return sortPackageJson({
    ...pkg,
    version: ctx.version,
    repository: {
      type: 'git',
      url: ctx.config.repositoryUrl,
      directory: ctx.releasePackage.relativeDir,
    },
    publishConfig: {
      ...(pkg.publishConfig ?? {}),
      access: ctx.config.publish?.access ?? 'public',
      provenance: ctx.config.publish?.provenance ?? true,
      ...(ctx.config.publish?.registry
        ? { registry: ctx.config.publish.registry }
        : {}),
    },
  })
}

export async function updateRootPackageVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  if (config.rootPackageJson === false) return

  const file = resolve(
    config.cwd ?? process.cwd(),
    config.rootPackageJson ?? 'package.json',
  )

  if (!existsSync(file)) return

  const json = readJson<PackageJsonLike>(file)
  json.version = version
  await writeJson(file, json)
}

export async function versionPackages(
  config: ReleaseConfig,
  options: VersionPackagesOptions,
): Promise<void> {
  if (!semver.valid(options.version)) {
    throw new Error(`Invalid semver version: ${options.version}`)
  }

  const packages = listPublishablePackages(config)

  for (const releasePackage of packages) {
    const current = readJson<PackageJsonLike>(releasePackage.packageJsonPath)
    const next = config.versionPackage
      ? config.versionPackage(current, {
          version: options.version,
          releasePackage,
          config,
        })
      : normalizePackageJson(current, {
          version: options.version,
          releasePackage,
          config,
        })

    if (options.dryRun) {
      console.log(`would version ${releasePackage.name} -> ${options.version}`)
      continue
    }

    await writeJson(releasePackage.packageJsonPath, next)
  }

  if (!options.dryRun) {
    await updateRootPackageVersion(config, options.version)

    await config.afterVersion?.({
      version: options.version,
      config,
    })
  }
}

export function parseVersionCliArgs(args: string[]): VersionPackagesOptions {
  let version = ''
  let dryRun = false

  for (const arg of args) {
    if (arg === '--dry-run' || arg === '--dry') {
      dryRun = true
      continue
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    }

    if (!version) {
      version = arg
      continue
    }

    throw new Error(`Unexpected argument: ${arg}`)
  }

  if (!version) {
    throw new Error('Usage: version:packages <version> [--dry-run]')
  }

  return {
    version,
    dryRun,
  }
}

export async function runVersionPackagesCli(
  config: ReleaseConfig,
): Promise<void> {
  await versionPackages(config, parseVersionCliArgs(process.argv.slice(2)))
}
