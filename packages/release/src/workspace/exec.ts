import { exec } from 'tinyexec'
import colors from 'picocolors'

function redact(value: string, masks: Array<string | undefined> = []): string {
  let next = value

  for (const mask of masks) {
    if (!mask) continue
    next = next.split(mask).join('***')
  }

  return next
}

export async function run(
  command: string,
  args: string[],
  options: {
    cwd?: string
    stdio?: 'inherit' | 'pipe'
    env?: NodeJS.ProcessEnv
    dryRun?: boolean
    reject?: boolean

    /**
     * Optional display label. Useful when args contain secrets.
     */
    label?: string

    /**
     * Sensitive values to redact from logs.
     */
    mask?: Array<string | undefined>
  } = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const rawLabel = options.label ?? `${command} ${args.join(' ')}`
  const label = redact(rawLabel, options.mask)

  if (options.dryRun) {
    console.log(colors.blue(`[dry-run] ${label}`))
    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
    }
  }

  console.log(colors.cyan(label))

  const result = await exec(command, args, {
    throwOnError: options.reject ?? true,
    nodeOptions: {
      cwd: options.cwd,
      stdio: options.stdio ?? 'inherit',
      env: {
        ...process.env,
        ...options.env,
      },
    },
  })

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.exitCode ?? 0,
  }
}
