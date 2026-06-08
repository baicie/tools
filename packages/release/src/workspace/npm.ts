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

export async function npmVersionExists(pkg: ReleasePackage): Promise<boolean> {
  const result = await run(
    'npm',
    ['view', `${pkg.name}@${pkg.version}`, 'version'],
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

export async function publishOnePackage(
  config: ReleaseConfig,
  pkg: ReleasePackage,
  options: PublishOptions,
): Promise<void> {
  const publishConfig = config.publish ?? {}
  const packageManager = config.packageManager ?? 'pnpm'
  const skipExisting =
    options.skipExisting ?? publishConfig.skipExisting ?? true

  if (skipExisting && (await npmVersionExists(pkg))) {
    console.log(colors.yellow(`skip existing ${pkg.name}@${pkg.version}`))
    return
  }

  const tag = resolveDistTag(pkg.version, options.tag)
  const args =
    packageManager === 'pnpm'
      ? [
          '--filter',
          pkg.name,
          'publish',
          '--access',
          publishConfig.access ?? 'public',
          '--tag',
          tag,
          '--no-git-checks',
        ]
      : ['publish', '--access', publishConfig.access ?? 'public', '--tag', tag]

  if (
    options.provenance &&
    publishConfig.provenance &&
    process.env.CI &&
    !options.dryRun
  ) {
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

      console.log(colors.green(`published ${pkg.name}@${pkg.version}`))
      return
    } catch (error) {
      if (await npmVersionExists(pkg)) {
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
