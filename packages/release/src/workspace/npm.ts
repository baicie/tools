import type { PublishOptions, ReleaseConfig, ReleasePackage } from './types'

import colors from 'picocolors'

import { run } from './exec'

export function resolveDistTag(version: string, explicit?: string): string {
  if (explicit) return explicit
  if (version.includes('canary')) return 'canary'
  if (version.includes('alpha')) return 'alpha'
  if (version.includes('beta')) return 'beta'
  if (version.includes('rc')) return 'rc'
  return 'latest'
}

function getRegistry(
  config: ReleaseConfig,
  options?: Pick<PublishOptions, 'registry'>,
): string | undefined {
  return options?.registry ?? config.publish?.registry
}

export async function npmVersionExists(
  config: ReleaseConfig,
  pkg: ReleasePackage,
  options?: Pick<PublishOptions, 'registry'>,
): Promise<boolean> {
  const registry = getRegistry(config, options)

  const result = await run(
    'npm',
    [
      'view',
      `${pkg.name}@${pkg.version}`,
      'version',
      ...(registry ? ['--registry', registry] : []),
    ],
    {
      stdio: 'pipe',
      reject: false,
    },
  )

  return result.exitCode === 0
}

function isRetryablePublishError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes('E409') ||
    message.includes('409 Conflict') ||
    /\b429\b/.test(message) ||
    /\b5\d\d\b/.test(message) ||
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNRESET') ||
    message.includes('ECONNABORTED') ||
    message.includes('EAI_AGAIN') ||
    message.includes('ENOTFOUND') ||
    message.includes('Failed to save packument') ||
    message.includes('previous package has been fully processed')
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function retryDelay(attempt: number): number {
  return Math.min(10_000 * 2 ** (attempt - 1), 60_000)
}

function shouldUseProvenance(
  config: ReleaseConfig,
  options: PublishOptions,
): boolean {
  const provenance = options.provenance ?? config.publish?.provenance ?? true

  return Boolean(
    provenance &&
    process.env.CI &&
    process.env.GITHUB_ACTIONS &&
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN &&
    !options.dryRun,
  )
}

export async function publishOnePackage(
  config: ReleaseConfig,
  pkg: ReleasePackage,
  options: PublishOptions,
): Promise<void> {
  const publishConfig = config.publish ?? {}
  const packageManager = config.packageManager ?? 'pnpm'
  const skipExisting =
    options.skipExisting ?? publishConfig.skipExisting ?? true
  const registry = getRegistry(config, options)

  if (skipExisting && (await npmVersionExists(config, pkg, options))) {
    console.log(colors.yellow(`skip existing ${pkg.name}@${pkg.version}`))
    return
  }

  const tag = resolveDistTag(pkg.version, options.tag)
  const commonArgs = [
    '--access',
    publishConfig.access ?? 'public',
    '--tag',
    tag,
    '--no-git-checks',
    ...(registry ? ['--registry', registry] : []),
  ]

  const args =
    packageManager === 'pnpm'
      ? ['--filter', pkg.name, 'publish', ...commonArgs]
      : ['publish', ...commonArgs]

  if (shouldUseProvenance(config, options)) {
    args.push('--provenance')
  }

  if (options.dryRun) {
    args.push('--dry-run')
  }

  const maxAttempts = options.dryRun ? 1 : (publishConfig.retry ?? 5)

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await run(packageManager, args, {
        cwd: packageManager === 'npm' ? pkg.dir : config.cwd,
        env: {
          NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN ?? process.env.NPM_TOKEN,
        },
      })

      console.log(
        colors.green(
          `${options.dryRun ? 'dry-run publish passed' : 'published'} ${pkg.name}@${pkg.version}`,
        ),
      )
      return
    } catch (error) {
      if (await npmVersionExists(config, pkg, options)) {
        console.log(
          colors.yellow(
            `${pkg.name}@${pkg.version} is visible on npm; treating publish as complete.`,
          ),
        )
        return
      }

      if (!isRetryablePublishError(error) || attempt === maxAttempts) {
        throw error
      }

      const delay = retryDelay(attempt)

      console.log(
        colors.yellow(
          `retryable npm error for ${pkg.name}; retrying in ${Math.round(delay / 1000)}s`,
        ),
      )

      await sleep(delay)
    }
  }
}
