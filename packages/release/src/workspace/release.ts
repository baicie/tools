import type { ReleaseConfig, ReleaseOptions } from './types'

import semver from 'semver'
import colors from 'picocolors'

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

    if (arg === '--publishOnly') {
      options.publishOnly = true
      continue
    }

    if (arg === '--tag') {
      const value = args[index + 1]
      if (!value) throw new Error('--tag requires a value')
      options.tag = value
      index += 1
      continue
    }

    if (arg.startsWith('--tag=')) {
      const value = arg.slice('--tag='.length)
      if (!value) throw new Error('--tag requires a value')
      options.tag = value
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

export async function runRelease(
  config: ReleaseConfig,
  options: ReleaseOptions,
): Promise<void> {
  if (options.publishOnly) {
    if (!options.version) {
      throw new Error('Version is required when using --publishOnly')
    }

    if (!semver.valid(options.version)) {
      throw new Error(`Invalid version: ${options.version}`)
    }

    if (!options.skipBuild && !options.skipPrecheck) {
      await runPrecheck(config, {
        strict: true,
        allowZero: false,
      })
    }

    await runPublish(config, {
      version: options.version,
      tag: options.tag,
      dryRun: false,
      skipExisting: config.publish?.skipExisting ?? true,
      provenance: config.publish?.provenance ?? true,
    })

    return
  }

  const version = options.version ?? getSharedVersion(config)

  if (!semver.valid(version)) {
    throw new Error(`Invalid version: ${version}`)
  }

  if (!options.dryRun && !options.skipGit) {
    await assertCleanGit()
  }

  await prepareVersion(config, version)

  await run(config.packageManager ?? 'pnpm', ['install', '--lockfile-only'], {
    cwd: config.cwd,
  })

  if (!options.skipPrecheck) {
    await runPrecheck(config, {
      strict: true,
      allowZero: false,
    })
  }

  await createReleasePlan(config, {
    json: false,
    checkNpm: !options.dryRun,
    version,
    tag: options.tag,
  })

  const tag = resolveDistTag(version, options.tag)

  if (options.dryRun) {
    await runPublish(config, {
      version,
      tag,
      dryRun: true,
      skipExisting: config.publish?.skipExisting ?? true,
      provenance: config.publish?.provenance ?? true,
    })

    console.log(colors.green('Release dry-run passed.'))
    console.log(
      colors.yellow(
        'Dry-run mutates version files and lockfile. Use git diff to inspect, then revert if needed.',
      ),
    )
    return
  }

  await commitAndTag({
    version,
    dryRun: false,
    skipGit: options.skipGit,
  })

  console.log(colors.green(`Release prepared. CI will publish v${version}.`))
}

export async function runReleaseCli(config: ReleaseConfig): Promise<void> {
  await runRelease(config, parseReleaseArgs(process.argv.slice(2)))
}
