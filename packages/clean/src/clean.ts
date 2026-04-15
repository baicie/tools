import path from 'node:path'
import fs from 'fs-extra'
import colors from 'picocolors'
import { exec } from 'tinyexec'
import type { CleanOptions, CleanResult, TargetInfo } from './types'

const DEFAULT_TARGETS = ['node_modules', 'target'] as const

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

async function getDirSize(dirPath: string): Promise<number> {
  try {
    const { stdout } = await exec('du', ['-sk', dirPath], {
      nodeOptions: { stdio: 'pipe' },
    })
    const kb = parseInt(stdout.trim().split('\t')[0], 10) || 0
    return kb * 1024
  } catch {
    return 0
  }
}

export async function scanForTargets(
  root: string,
  targets: ReadonlyArray<'node_modules' | 'target'>,
  verbose: boolean = false,
): Promise<TargetInfo[]> {
  const results: TargetInfo[] = []
  const visitedDirs = new Set<string>()

  async function scanDir(dir: string): Promise<void> {
    if (visitedDirs.has(dir)) return
    visitedDirs.add(dir)

    if (verbose) {
      console.info(colors.dim(`Scanning: ${dir}`))
    }

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          if (targets.includes(entry.name as 'node_modules' | 'target')) {
            const stats = await fs.lstat(fullPath)
            results.push({
              path: fullPath,
              size: 0,
              isSymlink: stats.isSymbolicLink(),
            })
          } else if (!entry.name.startsWith('.')) {
            await scanDir(fullPath)
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  await scanDir(root)

  if (results.length > 0) {
    const sizePromises = results.map(async info => {
      info.size = await getDirSize(info.path)
    })
    await Promise.all(sizePromises)
  }

  return results
}

export async function clean(options: CleanOptions = {}): Promise<CleanResult> {
  const {
    root = process.cwd(),
    verbose = false,
    dry = false,
    targets = DEFAULT_TARGETS,
  } = options

  const result: CleanResult = {
    count: 0,
    spaceSaved: 0,
    removed: [],
  }

  const targetsInfo = await scanForTargets(root, targets, verbose)

  if (targetsInfo.length === 0) {
    console.info(colors.green('No target directories found.'))
    return result
  }

  console.info(
    colors.cyan(`\nFound ${targetsInfo.length} target directory(ies):\n`),
  )
  for (const info of targetsInfo) {
    const sizeStr = formatSize(info.size)
    const symlinkStr = info.isSymlink ? colors.yellow(' [symlink]') : ''
    console.info(
      `  ${colors.dim(info.path)}  ${colors.yellow(sizeStr)}${symlinkStr}`,
    )
  }
  console.info()

  const totalSize = targetsInfo.reduce((sum, info) => sum + info.size, 0)
  console.info(`Total size: ${colors.yellow(formatSize(totalSize))}`)
  console.info()

  if (dry) {
    console.info(
      colors.yellow('Dry run mode - no directories will be deleted.\n'),
    )
    console.info(colors.green('The following directories would be removed:'))
    for (const info of targetsInfo) {
      console.info(colors.dim(`  - ${info.path}`))
    }
    return result
  }

  const deletePromises = targetsInfo.map(async info => {
    if (verbose) {
      console.info(colors.dim(`Removing: ${info.path}`))
    }

    try {
      await exec('rm', ['-rf', info.path], {
        throwOnError: false,
      })

      result.count++
      result.spaceSaved += info.size
      result.removed.push(info.path)

      if (verbose) {
        console.info(
          colors.green(`  Removed: ${info.path} (${formatSize(info.size)})`),
        )
      }
    } catch (error) {
      console.error(
        colors.red(
          `  Failed to remove ${info.path}: ${(error as Error).message}`,
        ),
      )
    }
  })

  await Promise.all(deletePromises)

  console.info(
    colors.green(
      `\nCleaned ${result.count} directory(ies), recovered ${formatSize(result.spaceSaved)}.`,
    ),
  )

  return result
}

export async function cleanNodeModules(
  root?: string,
  options: Partial<CleanOptions> = {},
): Promise<CleanResult> {
  return clean({ ...options, root, targets: ['node_modules'] })
}

export async function cleanTarget(
  root?: string,
  options: Partial<CleanOptions> = {},
): Promise<CleanResult> {
  return clean({ ...options, root, targets: ['target'] })
}
