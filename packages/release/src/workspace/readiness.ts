import type { CheckResult, ReleaseConfig, ReleasePackage } from './types'

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import colors from 'picocolors'

import { getUniqueVersions, listPublishablePackages } from './packages'

function hasExport(pkg: ReleasePackage, key: string): boolean {
  return Boolean(pkg.packageJson.exports && key in pkg.packageJson.exports)
}

function hasFile(pkg: ReleasePackage, file: string): boolean {
  return (
    Array.isArray(pkg.packageJson.files) && pkg.packageJson.files.includes(file)
  )
}

function hasDist(pkg: ReleasePackage, path: string): boolean {
  return existsSync(resolve(pkg.dir, path.replace(/^\.\//, '')))
}

function checkCommon(
  config: ReleaseConfig,
  pkg: ReleasePackage,
  errors: string[],
): void {
  if (!pkg.name.startsWith('@')) {
    errors.push(`${pkg.name}: scoped package name is recommended`)
  }

  if (!pkg.packageJson.description) {
    errors.push(`${pkg.name}: description is required`)
  }

  if (!pkg.packageJson.license) {
    errors.push(`${pkg.name}: license is required`)
  }

  if (!pkg.packageJson.exports) {
    errors.push(`${pkg.name}: exports is required`)
  }

  if (!hasFile(pkg, 'dist')) {
    errors.push(`${pkg.name}: files must include dist`)
  }

  if (!pkg.packageJson.scripts?.build) {
    errors.push(`${pkg.name}: scripts.build is required`)
  }

  if (!pkg.packageJson.scripts?.check && !pkg.packageJson.scripts?.typecheck) {
    errors.push(`${pkg.name}: scripts.check or scripts.typecheck is required`)
  }

  if (!hasDist(pkg, 'dist')) {
    errors.push(`${pkg.name}: dist missing`)
  }

  if (config.readiness?.strict) {
    const repository = pkg.packageJson.repository

    if (
      !repository ||
      typeof repository === 'string' ||
      repository.type !== 'git' ||
      repository.url !== config.repositoryUrl ||
      repository.directory !== pkg.relativeDir
    ) {
      errors.push(
        `${pkg.name}: repository must point to ${config.repositoryUrl} and ${pkg.relativeDir}`,
      )
    }

    if (
      !pkg.packageJson.publishConfig ||
      pkg.packageJson.publishConfig.access !==
        (config.publish?.access ?? 'public') ||
      pkg.packageJson.publishConfig.provenance !==
        (config.publish?.provenance ?? true)
    ) {
      errors.push(`${pkg.name}: publishConfig is invalid`)
    }
  }
}

function checkZeusWebPrimitive(pkg: ReleasePackage, errors: string[]): void {
  if (pkg.kind !== 'primitive') return

  for (const key of [
    '.',
    './wc',
    './react',
    './vue',
    './vue/global',
    './custom-elements.json',
    './zeus.components.json',
  ]) {
    if (!hasExport(pkg, key)) {
      errors.push(`${pkg.name}: missing export ${key}`)
    }
  }
}

function checkZeusWebIcons(pkg: ReleasePackage, errors: string[]): void {
  if (pkg.kind !== 'icons') return

  for (const key of [
    '.',
    './react',
    './vue',
    './wc',
    './manifest.json',
    './svg/*',
  ]) {
    if (!hasExport(pkg, key)) {
      errors.push(`${pkg.name}: missing export ${key}`)
    }
  }
}

export function checkReleaseReadiness(config: ReleaseConfig): CheckResult {
  const errors: string[] = []
  const warnings: string[] = []
  const packages = listPublishablePackages(config)
  const versions = getUniqueVersions(packages)

  if (packages.length === 0) {
    errors.push('No publishable packages found.')
  }

  if (versions.length > 1) {
    errors.push(
      `All packages must share the same version. Found: ${versions.join(', ')}`,
    )
  }

  if (!config.readiness?.allowZero && versions.includes('0.0.0')) {
    errors.push('0.0.0 is not allowed for release')
  }

  for (const pkg of packages) {
    if (config.readiness?.common !== false) {
      checkCommon(config, pkg, errors)
    }

    checkZeusWebPrimitive(pkg, errors)
    checkZeusWebIcons(pkg, errors)

    const customErrors = config.readiness?.package?.(pkg) ?? []
    errors.push(...customErrors)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

function parseReadinessArgs(
  args: string[],
  config: ReleaseConfig,
): ReleaseConfig {
  const next: ReleaseConfig = {
    ...config,
    readiness: {
      ...config.readiness,
    },
  }

  for (const arg of args) {
    if (arg === '--strict') {
      next.readiness!.strict = true
      continue
    }

    if (arg === '--allow-zero') {
      next.readiness!.allowZero = true
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return next
}

export async function runReadinessCli(config: ReleaseConfig): Promise<void> {
  const next = parseReadinessArgs(process.argv.slice(2), config)
  const result = checkReleaseReadiness(next)

  for (const warning of result.warnings) {
    console.log(colors.yellow(`- ${warning}`))
  }

  if (!result.valid) {
    console.error(colors.red('Release readiness check failed:'))

    for (const error of result.errors) {
      console.error(`- ${error}`)
    }

    process.exit(1)
  }

  console.log(colors.green('Release readiness check passed.'))
}
