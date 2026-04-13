import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import colors from 'picocolors'
import type {
  Options as TinyExecOptions,
  Result as TinyExecResult,
} from 'tinyexec'
import { exec } from 'tinyexec'
import type { ReleaseType } from 'semver'
import semver from 'semver'
import mri from 'mri'

export const args: Record<string, string> = mri(process.argv.slice(2))

export const isDryRun: boolean = !!args.dry

if (isDryRun) {
  console.log(colors.inverse(colors.yellow(' DRY RUN ')))
  console.log()
}

interface PackageInfo {
  pkg: {
    name: string
    version: string
    private?: boolean
  }
  pkgDir: string
  pkgPath: string
}

export function getPackageInfo(
  pkgName: string,
  getPkgDir: ((pkg: string) => string) | undefined = pkg => `packages/${pkg}`,
): PackageInfo {
  const pkgDir = path.resolve(getPkgDir(pkgName))
  const pkgPath = path.resolve(pkgDir, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
    name: string
    version: string
    private?: boolean
  }

  if (pkg.private) {
    throw new Error(`Package ${pkgName} is private`)
  }

  return { pkg, pkgDir, pkgPath }
}

export async function run(
  bin: string,
  args: string[],
  opts: Partial<TinyExecOptions> = {},
): Promise<TinyExecResult> {
  return exec(bin, args, {
    throwOnError: true,
    ...opts,
    nodeOptions: {
      stdio: 'inherit',
      ...opts.nodeOptions,
    },
  })
}

export async function dryRun(
  bin: string,
  args: string[],
  opts?: Partial<TinyExecOptions>,
): Promise<void> {
  return console.log(
    colors.blue(`[dryrun] ${bin} ${args.join(' ')}`),
    opts || '',
  )
}

interface RunIfNotDry {
  (
    bin: string,
    args: string[],
    opts?: Partial<TinyExecOptions>,
  ): Promise<TinyExecResult> | Promise<void>
}

export const runIfNotDry: RunIfNotDry = isDryRun ? dryRun : run

export function step(msg: string): void {
  return console.log(colors.cyan(msg))
}

interface VersionChoice {
  title: string
  value: string
}
export function getVersionChoices(currentVersion: string): VersionChoice[] {
  const currentBeta = currentVersion.includes('beta')
  const currentAlpha = currentVersion.includes('alpha')
  const isStable = !currentBeta && !currentAlpha

  function inc(i: ReleaseType, tag = currentAlpha ? 'alpha' : 'beta') {
    return semver.inc(currentVersion, i, tag)!
  }

  let versionChoices: VersionChoice[] = [
    {
      title: 'next',
      value: inc(isStable ? 'patch' : 'prerelease'),
    },
  ]

  if (isStable) {
    versionChoices.push(
      {
        title: 'beta-minor',
        value: inc('preminor'),
      },
      {
        title: 'beta-major',
        value: inc('premajor'),
      },
      {
        title: 'alpha-minor',
        value: inc('preminor', 'alpha'),
      },
      {
        title: 'alpha-major',
        value: inc('premajor', 'alpha'),
      },
      {
        title: 'minor',
        value: inc('minor'),
      },
      {
        title: 'major',
        value: inc('major'),
      },
    )
  } else if (currentAlpha) {
    versionChoices.push({
      title: 'beta',
      value: inc('patch') + '-beta.0',
    })
  } else {
    versionChoices.push({
      title: 'stable',
      value: inc('patch'),
    })
  }
  versionChoices.push({ value: 'custom', title: 'custom' })

  versionChoices = versionChoices.map(i => {
    i.title = `${i.title} (${i.value})`
    return i
  })

  return versionChoices
}

export function updateVersion(pkgPath: string, version: string): void {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  pkg.version = version
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

export interface VersionBackup {
  pkgPath: string
  originalVersion: string
  updatedVersion: string
}

export const versionBackups: VersionBackup[] = []

export function backupVersion(
  pkgPath: string,
  originalVersion: string,
  updatedVersion: string,
): void {
  versionBackups.push({ pkgPath, originalVersion, updatedVersion })
}

export function clearBackups(): void {
  versionBackups.length = 0
}

export function rollbackVersion(): void {
  for (const backup of versionBackups) {
    const pkg = JSON.parse(readFileSync(backup.pkgPath, 'utf-8'))
    pkg.version = backup.originalVersion
    writeFileSync(backup.pkgPath, JSON.stringify(pkg, null, 2) + '\n')
    console.log(
      colors.yellow(
        `Rolled back ${backup.pkgPath} to version ${backup.originalVersion}`,
      ),
    )
  }
  clearBackups()
}

export async function publishPackage(
  pkgDir: string,
  tag?: string,
  provenance?: boolean,
  packageManager: 'npm' | 'pnpm' = 'npm',
): Promise<void> {
  const publicArgs = ['publish', '--access', 'public']
  if (tag) {
    publicArgs.push(`--tag`, tag)
  }
  if (provenance) {
    publicArgs.push(`--provenance`)
  }
  if (packageManager === 'pnpm') {
    publicArgs.push(`--no-git-checks`)
  }
  await runIfNotDry(packageManager, publicArgs, {
    nodeOptions: { cwd: pkgDir },
  })
}

export async function getActiveVersion(
  npmName: string,
): Promise<string | undefined> {
  try {
    const { stdout } = await run(
      'npm',
      ['info', npmName, 'version', '--json'],
      { throwOnError: false, nodeOptions: { stdio: 'pipe' } },
    )
    if (!stdout) return
    const parsed = JSON.parse(stdout)
    // E404 response has error structure
    if (parsed.error) return
    return parsed
  } catch {
    // Package not published yet
    return
  }
}
