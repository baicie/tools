import type { ReleaseConfig, ReleaseOptions, ReleaseVersionBump } from './types'

import semver from 'semver'
import colors from 'picocolors'
import prompts from 'prompts'

import { assertCleanGit, commitAndTag } from './git'
import { getSharedVersion } from './packages'
import { createReleasePlan } from './plan'
import { runPrecheck } from './precheck'
import { runPublish } from './publish'
import { runChangesetsFixedVersion } from './changesets'
import { versionPackages } from './version'
import { run } from './exec'
import { resolveDistTag } from './npm'

function parseReleaseArgs(args: string[]): ReleaseOptions {
  const options: ReleaseOptions = {
    dryRun: false,
    skipGit: false,
    skipPrecheck: false,
    skipBuild: false,
    skipPrompts: false,
    publish: false,
    publishOnly: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--dry' || arg === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (arg === '--skipGit') {
      options.skipGit = true
      continue
    }

    if (arg === '--skipPrecheck') {
      options.skipPrecheck = true
      continue
    }

    if (arg === '--skipBuild') {
      options.skipBuild = true
      continue
    }

    if (arg === '--skipPrompts' || arg === '--yes' || arg === '-y') {
      options.skipPrompts = true
      continue
    }

    if (arg === '--publish') {
      options.publish = true
      continue
    }

    if (arg === '--publishOnly') {
      options.publishOnly = true
      continue
    }

    if (
      arg === '--tag' ||
      arg === '--preid' ||
      arg === '--registry' ||
      arg === '--bump'
    ) {
      const value = args[index + 1]
      if (!value) throw new Error(`${arg} requires a value`)

      if (arg === '--tag') options.tag = value
      if (arg === '--preid') options.preid = value
      if (arg === '--registry') options.registry = value
      if (arg === '--bump') options.bump = value as ReleaseVersionBump

      index += 1
      continue
    }

    if (arg.startsWith('--tag=')) {
      options.tag = arg.slice('--tag='.length)
      continue
    }

    if (arg.startsWith('--preid=')) {
      options.preid = arg.slice('--preid='.length)
      continue
    }

    if (arg.startsWith('--registry=')) {
      options.registry = arg.slice('--registry='.length)
      continue
    }

    if (arg.startsWith('--bump=')) {
      options.bump = arg.slice('--bump='.length) as ReleaseVersionBump
      continue
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    }

    if (!options.version) {
      options.version = arg
      continue
    }

    throw new Error(`Unexpected argument: ${arg}`)
  }

  return options
}

function incVersion(
  current: string,
  bump: ReleaseVersionBump,
  preid?: string,
): string {
  const next = preid
    ? semver.inc(current, bump, preid)
    : semver.inc(current, bump)

  if (!next) {
    throw new Error(`Cannot bump ${current} with ${bump}`)
  }

  return next
}

async function resolveReleaseVersion(
  config: ReleaseConfig,
  options: ReleaseOptions,
): Promise<string> {
  if (options.version) {
    if (!semver.valid(options.version)) {
      throw new Error(`Invalid version: ${options.version}`)
    }

    return options.version
  }

  const current = getSharedVersion(config)

  if (options.bump) {
    return incVersion(current, options.bump, options.preid)
  }

  if (options.skipPrompts || !process.stdin.isTTY) {
    throw new Error(
      'Version is required in non-interactive mode. Pass a version or --bump.',
    )
  }

  const choices = [
    {
      title: `patch ${incVersion(current, 'patch')}`,
      value: incVersion(current, 'patch'),
    },
    {
      title: `minor ${incVersion(current, 'minor')}`,
      value: incVersion(current, 'minor'),
    },
    {
      title: `major ${incVersion(current, 'major')}`,
      value: incVersion(current, 'major'),
    },
    {
      title: `beta ${incVersion(current, semver.prerelease(current) ? 'prerelease' : 'prepatch', 'beta')}`,
      value: incVersion(
        current,
        semver.prerelease(current) ? 'prerelease' : 'prepatch',
        'beta',
      ),
    },
    {
      title: 'custom',
      value: 'custom',
    },
  ]

  const response = await prompts([
    {
      type: 'select',
      name: 'version',
      message: `Current version is ${current}. Select next version`,
      choices,
    },
    {
      type: prev => (prev === 'custom' ? 'text' : null),
      name: 'customVersion',
      message: 'Input custom version',
      validate: value =>
        semver.valid(value) ? true : 'Invalid semver version',
    },
  ])

  const version =
    response.version === 'custom' ? response.customVersion : response.version

  if (!version || !semver.valid(version)) {
    throw new Error('Release cancelled or invalid version.')
  }

  return version
}

async function prepareVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  if (config.mode === 'changesets-fixed') {
    await runChangesetsFixedVersion(config, version)
    return
  }

  await versionPackages(config, {
    version,
    dryRun: false,
  })
}

async function confirmRelease(
  version: string,
  options: ReleaseOptions,
): Promise<void> {
  if (options.skipPrompts || options.dryRun || !process.stdin.isTTY) {
    return
  }

  const response = await prompts({
    type: 'confirm',
    name: 'ok',
    message: `Release v${version}?`,
    initial: false,
  })

  if (!response.ok) {
    throw new Error('Release cancelled.')
  }
}

export async function runRelease(
  config: ReleaseConfig,
  options: ReleaseOptions,
): Promise<void> {
  const activeConfig: ReleaseConfig = options.registry
    ? {
        ...config,
        publish: {
          ...(config.publish ?? {}),
          registry: options.registry,
        },
      }
    : config

  if (options.publishOnly) {
    if (!options.version) {
      throw new Error('Version is required when using --publishOnly')
    }

    if (!semver.valid(options.version)) {
      throw new Error(`Invalid version: ${options.version}`)
    }

    if (!options.skipBuild && !options.skipPrecheck) {
      await runPrecheck(activeConfig, {
        strict: true,
        allowZero: false,
      })
    }

    await runPublish(activeConfig, {
      version: options.version,
      tag: options.tag,
      registry: options.registry,
      dryRun: false,
      skipExisting: activeConfig.publish?.skipExisting ?? true,
      provenance: activeConfig.publish?.provenance ?? true,
    })

    return
  }

  const version = await resolveReleaseVersion(activeConfig, options)

  if (!options.dryRun && !options.skipGit) {
    await assertCleanGit(activeConfig.cwd)
  }

  await confirmRelease(version, options)

  await prepareVersion(activeConfig, version)

  await run(
    activeConfig.packageManager ?? 'pnpm',
    ['install', '--lockfile-only'],
    {
      cwd: activeConfig.cwd,
    },
  )

  if (!options.skipPrecheck) {
    await runPrecheck(activeConfig, {
      strict: true,
      allowZero: false,
    })
  }

  await createReleasePlan(activeConfig, {
    json: false,
    checkNpm: !options.dryRun,
    version,
    tag: options.tag,
    registry: options.registry,
  })

  const tag = resolveDistTag(version, options.tag)

  if (options.dryRun) {
    await runPublish(activeConfig, {
      version,
      tag,
      registry: options.registry,
      dryRun: true,
      skipExisting: activeConfig.publish?.skipExisting ?? true,
      provenance: activeConfig.publish?.provenance ?? true,
    })

    console.log(colors.green('Release dry-run passed.'))
    console.log(
      colors.yellow(
        'Dry-run mutates version files, changelog and lockfile. Use git diff to inspect, then revert if needed.',
      ),
    )
    return
  }

  if (options.publish) {
    await runPublish(activeConfig, {
      version,
      tag,
      registry: options.registry,
      dryRun: false,
      skipExisting: activeConfig.publish?.skipExisting ?? true,
      provenance: activeConfig.publish?.provenance ?? true,
    })
  }

  await commitAndTag({
    version,
    dryRun: false,
    skipGit: options.skipGit,
    cwd: activeConfig.cwd,
  })

  console.log(colors.green(`Release prepared. CI will publish v${version}.`))
}

export async function runReleaseCli(config: ReleaseConfig): Promise<void> {
  await runRelease(config, parseReleaseArgs(process.argv.slice(2)))
}
