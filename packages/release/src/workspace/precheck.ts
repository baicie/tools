import type { PrecheckOptions, ReleaseConfig } from './types'

import { run } from './exec'

function parsePrecheckArgs(args: string[]): PrecheckOptions {
  const options: PrecheckOptions = {
    strict: false,
    allowZero: false,
  }

  for (const arg of args) {
    if (arg === '--strict') {
      options.strict = true
      continue
    }

    if (arg === '--allow-zero') {
      options.allowZero = true
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return options
}

export async function runPrecheck(
  config: ReleaseConfig,
  options: PrecheckOptions,
): Promise<void> {
  for (const command of config.precheck?.commands ?? []) {
    const [bin, ...args] = command

    await run(bin, args, {
      cwd: config.cwd,
    })
  }

  await run(
    config.packageManager ?? 'pnpm',
    [
      'release:verify',
      ...(options.strict ? ['--strict'] : []),
      ...(options.allowZero ? ['--allow-zero'] : []),
    ],
    {
      cwd: config.cwd,
    },
  )
}

export async function runPrecheckCli(config: ReleaseConfig): Promise<void> {
  await runPrecheck(config, parsePrecheckArgs(process.argv.slice(2)))
}
