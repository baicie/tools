import type { PublishOptions, ReleaseConfig } from './types'

import colors from 'picocolors'

import { getUniqueVersions, listPublishablePackages } from './packages'
import { publishOnePackage, resolveDistTag } from './npm'

function parsePublishArgs(args: string[]): PublishOptions {
  const options: PublishOptions = {
    dryRun: false,
    skipExisting: true,
    provenance: true,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--dry-run' || arg === '--dry') {
      options.dryRun = true
      continue
    }

    if (arg === '--no-skip-existing') {
      options.skipExisting = false
      continue
    }

    if (arg === '--no-provenance') {
      options.provenance = false
      continue
    }

    if (arg === '--tag' || arg === '--version') {
      const value = args[index + 1]
      if (!value) throw new Error(`${arg} requires a value`)
      if (arg === '--tag') options.tag = value
      if (arg === '--version') options.version = value
      index += 1
      continue
    }

    if (arg.startsWith('--tag=')) {
      options.tag = arg.slice('--tag='.length)
      continue
    }

    if (arg.startsWith('--version=')) {
      options.version = arg.slice('--version='.length)
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return options
}

export async function runPublish(
  config: ReleaseConfig,
  options: PublishOptions,
): Promise<void> {
  const packages = listPublishablePackages(config)
  const versions = getUniqueVersions(packages)

  if (versions.length !== 1) {
    throw new Error(
      `Publish requires one shared version. Found: ${versions.join(', ')}`,
    )
  }

  const version = options.version ?? versions[0]

  if (version !== versions[0]) {
    throw new Error(
      `Requested version ${version} does not match package version ${versions[0]}`,
    )
  }

  if (
    !options.dryRun &&
    !process.env.NODE_AUTH_TOKEN &&
    !process.env.NPM_TOKEN
  ) {
    throw new Error('NODE_AUTH_TOKEN or NPM_TOKEN is required for publish.')
  }

  const tag = resolveDistTag(version, options.tag)

  console.log(
    colors.bold(`Publishing ${packages.length} package(s) ${version} (${tag})`),
  )

  for (const pkg of packages) {
    await publishOnePackage(config, pkg, options)
  }
}

export async function runPublishCli(config: ReleaseConfig): Promise<void> {
  await runPublish(config, parsePublishArgs(process.argv.slice(2)))
}
