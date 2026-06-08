import { exec } from 'tinyexec'
import colors from 'picocolors'

export async function run(
  command: string,
  args: string[],
  options: {
    cwd?: string
    stdio?: 'inherit' | 'pipe'
    env?: NodeJS.ProcessEnv
    dryRun?: boolean
    reject?: boolean
  } = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const label = `${command} ${args.join(' ')}`

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
