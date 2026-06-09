import type { CanaryOptions, ReleaseConfig } from './types'

import { writeFileSync } from 'node:fs'
import semver from 'semver'
import colors from 'picocolors'

import { getSharedVersion } from './packages'
import { versionPackages } from './version'
import { runPrecheck } from './precheck'
import { runPublish } from './publish'
import { run } from './exec'

function parseCanaryArgs(args: string[]): CanaryOptions {
  const options: CanaryOptions = {
    forceLocal: false,
  }

  for (const arg of args) {
    if (arg === '--force-local') {
      options.forceLocal = true
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return options
}

function getCanaryVersion(config: ReleaseConfig): string {
  const base = semver.parse(getSharedVersion(config))

  if (!base) {
    throw new Error('Invalid base version')
  }

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const runNumber = process.env.GITHUB_RUN_NUMBER ?? Date.now().toString()
  const runAttempt = process.env.GITHUB_RUN_ATTEMPT ?? '1'
  const shortSha = process.env.GITHUB_SHA?.slice(0, 8) ?? 'local'
  const prefix = config.canary?.prefix ?? 'canary'

  return `${base.major}.${base.minor}.${base.patch}-${prefix}.${date}.${runNumber}.${runAttempt}.${shortSha}`
}

function getBranchFromGitHubEnv(): string | undefined {
  if (process.env.GITHUB_HEAD_REF) return process.env.GITHUB_HEAD_REF
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME

  const ref = process.env.GITHUB_REF
  if (!ref) return undefined

  if (ref.startsWith('refs/heads/')) {
    return ref.slice('refs/heads/'.length)
  }

  return undefined
}

async function getCurrentBranch(config: ReleaseConfig): Promise<string> {
  const envBranch = getBranchFromGitHubEnv()

  if (envBranch) {
    return envBranch
  }

  const result = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: config.cwd,
    stdio: 'pipe',
  })

  return result.stdout.trim()
}

function branchPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')

  return new RegExp(`^${escaped}$`)
}

function branchMatches(branch: string, patterns: string[]): boolean {
  return patterns.some(pattern => branchPatternToRegExp(pattern).test(branch))
}

async function dispatchDownstream(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  const dispatch = config.canary?.dispatch

  if (!dispatch) return

  const token = process.env[dispatch.tokenEnv]
  if (!token) return

  const sha = process.env.GITHUB_SHA ?? ''
  const payload = dispatch.payload?.({ version, sha }) ?? {
    source: config.repo,
    sha,
    version,
  }

  const url = `https://api.github.com/repos/${dispatch.repository}/dispatches`

  await run(
    'curl',
    [
      '--fail-with-body',
      '-X',
      'POST',
      '-H',
      'Accept: application/vnd.github+json',
      '-H',
      `Authorization: Bearer ${token}`,
      '-H',
      'X-GitHub-Api-Version: 2022-11-28',
      url,
      '-d',
      JSON.stringify({
        event_type: dispatch.eventType,
        client_payload: payload,
      }),
    ],
    {
      mask: [token],
      label: `curl --fail-with-body -X POST ${url}`,
    },
  )
}

export async function runCanary(
  config: ReleaseConfig,
  options: CanaryOptions,
): Promise<void> {
  if (!config.canary?.enabled) {
    throw new Error('Canary release is not enabled in release config.')
  }

  if (!process.env.CI && !options.forceLocal) {
    throw new Error(
      'Canary release is intended to run in CI. Use --force-local for local debug.',
    )
  }

  const includeBranches = config.canary?.includeBranches

  if (includeBranches && includeBranches.length > 0) {
    const branch = await getCurrentBranch(config)

    if (!branchMatches(branch, includeBranches)) {
      throw new Error(
        `Canary release is not allowed on branch "${branch}". Allowed branches: ${includeBranches.join(', ')}`,
      )
    }
  }

  if (!process.env.NODE_AUTH_TOKEN && !process.env.NPM_TOKEN) {
    throw new Error(
      'NODE_AUTH_TOKEN or NPM_TOKEN is required for canary publish.',
    )
  }

  const version = getCanaryVersion(config)

  console.log(colors.cyan(`Preparing canary ${version}`))

  if (process.env.GITHUB_ENV) {
    writeFileSync(
      process.env.GITHUB_ENV,
      `${config.canary.envName ?? 'CANARY_VERSION'}=${version}\n`,
      { flag: 'a' },
    )
  }

  await versionPackages(config, {
    version,
    dryRun: false,
  })

  await run(config.packageManager ?? 'pnpm', ['install', '--lockfile-only'], {
    cwd: config.cwd,
  })

  await runPrecheck(config, {
    strict: true,
    allowZero: false,
  })

  await runPublish(config, {
    version,
    tag: config.canary.tag ?? 'canary',
    dryRun: true,
    skipExisting: true,
    provenance: config.publish?.provenance ?? true,
  })

  await runPublish(config, {
    version,
    tag: config.canary.tag ?? 'canary',
    dryRun: false,
    skipExisting: true,
    provenance: config.publish?.provenance ?? true,
  })

  await dispatchDownstream(config, version)
}

export async function runCanaryCli(config: ReleaseConfig): Promise<void> {
  await runCanary(config, parseCanaryArgs(process.argv.slice(2)))
}
