import type { ReleaseConfig, ReleasePlan } from './types'

import colors from 'picocolors'

import { getUniqueVersions, listPublishablePackages } from './packages'
import { npmVersionExists, resolveDistTag } from './npm'

interface PlanOptions {
  json: boolean
  checkNpm: boolean
  tag?: string
  version?: string
}

function parsePlanArgs(args: string[]): PlanOptions {
  const options: PlanOptions = {
    json: false,
    checkNpm: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--json') {
      options.json = true
      continue
    }

    if (arg === '--check-npm') {
      options.checkNpm = true
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

export async function createReleasePlan(
  config: ReleaseConfig,
  options: PlanOptions,
): Promise<ReleasePlan> {
  const packages = listPublishablePackages(config)
  const versions = getUniqueVersions(packages)

  if (versions.length !== 1) {
    throw new Error(
      `Release plan requires one shared version. Found: ${versions.join(', ')}`,
    )
  }

  const version = options.version ?? versions[0]

  if (version !== versions[0]) {
    throw new Error(
      `Requested version ${version} does not match package version ${versions[0]}`,
    )
  }

  const tag = resolveDistTag(version, options.tag)

  return {
    version,
    tag,
    packages: await Promise.all(
      packages.map(async pkg => ({
        name: pkg.name,
        version: pkg.version,
        directory: pkg.relativeDir,
        npmExists: options.checkNpm ? await npmVersionExists(pkg) : undefined,
      })),
    ),
  }
}

export async function runReleasePlanCli(config: ReleaseConfig): Promise<void> {
  const options = parsePlanArgs(process.argv.slice(2))
  const plan = await createReleasePlan(config, options)

  if (options.json) {
    console.log(JSON.stringify(plan, null, 2))
    return
  }

  console.log(colors.bold(`Release plan: ${plan.version} (${plan.tag})`))

  for (const item of plan.packages) {
    const status =
      item.npmExists === undefined
        ? ''
        : item.npmExists
          ? colors.yellow(' already exists')
          : colors.green(' new')

    console.log(
      `  ${item.name}@${item.version} ${colors.gray(item.directory)}${status}`,
    )
  }
}
