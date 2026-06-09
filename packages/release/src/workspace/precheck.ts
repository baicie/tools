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

  const verifyCommand = config.precheck?.verifyCommand

  if (verifyCommand && verifyCommand.length > 0) {
    const [bin, ...args] = verifyCommand

    await run(
      bin,
      [
        ...args,
        ...(options.strict ? ['--strict'] : []),
        ...(options.allowZero ? ['--allow-zero'] : []),
      ],
      {
        cwd: config.cwd,
      },
    )
  }
}

export async function runPrecheckCli(config: ReleaseConfig): Promise<void> {
  await runPrecheck(config, parsePrecheckArgs(process.argv.slice(2)))
}
