可以抽，而且我建议把 `zeus` 和 `zeus-ui` 的 release 逻辑统一抽成一个 **配置驱动的 release kit**，放到：

```txt
https://github.com/baicie/tools/tree/main/packages/release/src
```

现在 `@baicie/release` 已经有基础 `release / publish / generateChangelog` 导出。
但它当前更偏“单包/linkedPackages 发布工具”：`release()` 需要手动传 `packages / linkedPackages / toTag / getPkgDir`，内部会选包、改版本、跑 publint、commit、tag、push。
`publish()` 当前也是基于 tag 推断单个 package，再执行 publish。
所以要承载 `zeus` 和 `zeus-ui`，需要新增一套 **workspace 级 release API**，不要破坏旧 API。

---

# 最终设计

## 目标

```txt
@baicie/release

保留旧 API：
  release()
  publish()
  generateChangelog()

新增 workspace API：
  defineReleaseConfig()
  runReleaseCli()
  runPublishCli()
  runPrecheckCli()
  runReleasePlanCli()
  runVersionPackagesCli()
  runCanaryCli()
  runReadinessCli()
```

---

# 两种仓库模式

## 1. zeus：changeset fixed group 模式

适合：

```txt
@zeus-js/shared
@zeus-js/signal
@zeus-js/runtime-dom
@zeus-js/compiler
@zeus-js/zeus
@zeus-js/bundler-plugin
...
```

特点：

```txt
使用 changeset version
fixed group 统一版本
生成统一 CHANGELOG
tag 触发 GitHub Actions
publishOnly 只发布
canary 自动发布
```

`zeus` 现在就是 changeset fixed group，并且 `.changeset/config.json` 里已经有 fixed group。

---

## 2. zeus-ui：workspace fixed 模式

适合：

```txt
@zeus-web/button
@zeus-web/input
@zeus-web/themes
@zeus-web/icons
@zeus-web/cli
@zeus-web/registry
...
```

特点：

```txt
不用 changeset
直接扫描 packages/* 和 packages/primitives/*
统一写 version
补 repository / publishConfig
release readiness 强校验
tag 触发 GitHub Actions
publishOnly 只发布
canary 自动发布
```

---

# 抽离后的目录

在 `tools/packages/release/src` 新增：

```txt
src/
  index.ts
  workspace/
    types.ts
    config.ts
    fs.ts
    exec.ts
    git.ts
    npm.ts
    packages.ts
    version.ts
    changesets.ts
    changelog.ts
    readiness.ts
    plan.ts
    publish.ts
    precheck.ts
    release.ts
    canary.ts
```

旧的：

```txt
src/release.ts
src/publish.ts
src/changelog.ts
src/utils.ts
src/types.d.ts
```

继续保留，避免已有项目炸掉。

---

# 1. 修改 `packages/release/src/index.ts`

```ts
export { publish } from './publish'
export { release } from './release'
export { generateChangelog } from './changelog'

export {
  defineReleaseConfig,
  runCanaryCli,
  runPrecheckCli,
  runPublishCli,
  runReadinessCli,
  runReleaseCli,
  runReleasePlanCli,
  runVersionPackagesCli,
} from './workspace'

export type {
  CanaryOptions,
  CheckResult,
  PackageJsonLike,
  PrecheckOptions,
  PublishOptions,
  ReleaseConfig,
  ReleaseMode,
  ReleaseOptions,
  ReleasePackage,
  ReleasePlan,
  ReleasePlanItem,
  VersionPackagesOptions,
  WorkspaceDiscoverOptions,
} from './workspace'
```

---

# 2. 新增 `packages/release/src/workspace/index.ts`

```ts
export { defineReleaseConfig } from './config'
export { runCanaryCli } from './canary'
export { runPrecheckCli } from './precheck'
export { runPublishCli } from './publish'
export { runReadinessCli } from './readiness'
export { runReleaseCli } from './release'
export { runReleasePlanCli } from './plan'
export { runVersionPackagesCli } from './version'

export type {
  CanaryOptions,
  CheckResult,
  PackageJsonLike,
  PrecheckOptions,
  PublishOptions,
  ReleaseConfig,
  ReleaseMode,
  ReleaseOptions,
  ReleasePackage,
  ReleasePlan,
  ReleasePlanItem,
  VersionPackagesOptions,
  WorkspaceDiscoverOptions,
} from './types'
```

---

# 3. 新增 `packages/release/src/workspace/types.ts`

```ts
export type ReleaseMode = 'changesets-fixed' | 'workspace-fixed'

export interface PackageJsonLike {
  name?: string
  private?: boolean
  version?: string
  description?: string
  license?: string
  type?: string
  files?: string[]
  exports?: Record<string, unknown>
  bin?: Record<string, string>
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, Record<string, unknown>>
  repository?:
    | string
    | {
        type?: string
        url?: string
        directory?: string
      }
  publishConfig?: {
    access?: string
    provenance?: boolean
    registry?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface ReleasePackage {
  name: string
  version: string
  dir: string
  relativeDir: string
  packageJsonPath: string
  packageJson: PackageJsonLike
  isPrivate: boolean
  kind?: string
}

export interface WorkspaceDiscoverOptions {
  roots: string[]
  ignore?: string[]
  include?: string[]
  packageKind?: (
    relativeDir: string,
    pkg: PackageJsonLike,
  ) => string | undefined
}

export interface CheckResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface ReleasePlanItem {
  name: string
  version: string
  directory: string
  npmExists?: boolean
}

export interface ReleasePlan {
  version: string
  tag: string
  packages: ReleasePlanItem[]
}

export interface ReleaseConfig {
  repo: string
  repositoryUrl: string
  mode: ReleaseMode
  packageManager?: 'pnpm' | 'npm'
  cwd?: string

  workspace: WorkspaceDiscoverOptions

  fixedPackages?: string[]
  changesetFile?: string
  rootVersionPackage?: string
  changelogFile?: string

  publish?: {
    access?: 'public' | 'restricted'
    provenance?: boolean
    registry?: string
    skipExisting?: boolean
    retry?: number
  }

  precheck?: {
    commands: string[][]
  }

  readiness?: {
    allowZero?: boolean
    strict?: boolean
    common?: boolean
    package?: (pkg: ReleasePackage) => string[]
  }

  canary?: {
    enabled?: boolean
    prefix?: string
    tag?: string
    envName?: string
    includeBranches?: string[]
    dispatch?: {
      tokenEnv: string
      repository: string
      eventType: string
      payload?: (ctx: {
        version: string
        sha: string
      }) => Record<string, unknown>
    }
  }

  versionPackage?: (
    pkg: PackageJsonLike,
    ctx: {
      version: string
      releasePackage: ReleasePackage
      config: ReleaseConfig
    },
  ) => PackageJsonLike

  afterVersion?: (ctx: {
    version: string
    config: ReleaseConfig
  }) => void | Promise<void>
}

export interface ReleaseOptions {
  version?: string
  tag?: string
  dryRun: boolean
  skipGit: boolean
  skipPrecheck: boolean
  skipBuild: boolean
  publishOnly: boolean
}

export interface PublishOptions {
  version?: string
  tag?: string
  dryRun: boolean
  skipExisting: boolean
  provenance: boolean
}

export interface PrecheckOptions {
  strict: boolean
  allowZero: boolean
}

export interface VersionPackagesOptions {
  version: string
  dryRun: boolean
}

export interface CanaryOptions {
  forceLocal: boolean
}
```

---

# 4. 新增 `packages/release/src/workspace/config.ts`

```ts
import type { ReleaseConfig } from './types'

export function defineReleaseConfig(config: ReleaseConfig): ReleaseConfig {
  return {
    packageManager: 'pnpm',
    publish: {
      access: 'public',
      provenance: true,
      skipExisting: true,
      retry: 5,
      ...config.publish,
    },
    readiness: {
      common: true,
      allowZero: false,
      strict: false,
      ...config.readiness,
    },
    ...config,
  }
}
```

---

# 5. 新增 `packages/release/src/workspace/fs.ts`

```ts
import { existsSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { mkdir } from 'node:fs/promises'

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf-8')) as T
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf-8')
}

export function fileExists(file: string): boolean {
  return existsSync(file)
}

export function readText(file: string): string {
  return readFileSync(file, 'utf-8')
}
```

---

# 6. 新增 `packages/release/src/workspace/exec.ts`

```ts
import { x } from 'tinyexec'
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

  const result = await x(command, args, {
    nodeOptions: {
      cwd: options.cwd,
      stdio: options.stdio ?? 'inherit',
      env: {
        ...process.env,
        ...options.env,
      },
    },
    throwOnError: options.reject ?? true,
  })

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.exitCode,
  }
}
```

> 你当前 `@baicie/release` 已经依赖 `tinyexec`。
> 旧 `utils.ts` 也已经基于 `tinyexec` 封装了 run/publishPackage。

---

# 7. 新增 `packages/release/src/workspace/packages.ts`

```ts
import type { PackageJsonLike, ReleaseConfig, ReleasePackage } from './types'

import { existsSync, readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'

import { readJson } from './fs'

function slash(value: string): string {
  return value.replace(/\\/g, '/')
}

function isIgnored(
  name: string,
  relativeDir: string,
  config: ReleaseConfig,
): boolean {
  const ignore = config.workspace.ignore ?? []

  return ignore.includes(name) || ignore.includes(relativeDir)
}

function isIncluded(name: string, config: ReleaseConfig): boolean {
  const include = config.workspace.include

  if (!include || include.length === 0) return true

  return include.includes(name)
}

export function listWorkspacePackages(config: ReleaseConfig): ReleasePackage[] {
  const cwd = config.cwd ?? process.cwd()
  const packages: ReleasePackage[] = []
  const seen = new Set<string>()

  for (const root of config.workspace.roots) {
    const absoluteRoot = resolve(cwd, root)

    if (!existsSync(absoluteRoot)) continue

    for (const entry of readdirSync(absoluteRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue

      const dir = resolve(absoluteRoot, entry.name)
      const packageJsonPath = resolve(dir, 'package.json')

      if (!existsSync(packageJsonPath)) continue
      if (seen.has(dir)) continue

      const packageJson = readJson<PackageJsonLike>(packageJsonPath)

      if (!packageJson.name) {
        throw new Error(`${packageJsonPath} missing package name`)
      }

      const relativeDir = slash(relative(cwd, dir))

      if (isIgnored(packageJson.name, relativeDir, config)) continue
      if (!isIncluded(packageJson.name, config)) continue

      packages.push({
        name: packageJson.name,
        version: packageJson.version ?? '0.0.0',
        dir,
        relativeDir,
        packageJsonPath,
        packageJson,
        isPrivate: Boolean(packageJson.private),
        kind: config.workspace.packageKind?.(relativeDir, packageJson),
      })

      seen.add(dir)
    }
  }

  return packages.sort((a, b) => {
    if ((a.kind ?? '') !== (b.kind ?? '')) {
      return (a.kind ?? '').localeCompare(b.kind ?? '')
    }

    return a.name.localeCompare(b.name)
  })
}

export function listPublishablePackages(
  config: ReleaseConfig,
): ReleasePackage[] {
  return listWorkspacePackages(config).filter(pkg => !pkg.isPrivate)
}

export function getUniqueVersions(packages: ReleasePackage[]): string[] {
  return Array.from(new Set(packages.map(pkg => pkg.version))).sort()
}

export function getSharedVersion(config: ReleaseConfig): string {
  const versions = getUniqueVersions(listPublishablePackages(config))

  if (versions.length !== 1) {
    throw new Error(
      `Expected one shared version. Found: ${versions.join(', ')}`,
    )
  }

  return versions[0]
}
```

---

# 8. 新增 `packages/release/src/workspace/npm.ts`

```ts
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
```

---

# 9. 新增 `packages/release/src/workspace/git.ts`

```ts
import colors from 'picocolors'

import { run } from './exec'

export async function gitStatus(): Promise<string> {
  const result = await run('git', ['status', '--porcelain'], {
    stdio: 'pipe',
  })

  return result.stdout.trim()
}

export async function assertCleanGit(): Promise<void> {
  const status = await gitStatus()

  if (status) {
    throw new Error(
      'Git working tree is not clean. Commit or stash changes before release.',
    )
  }
}

export async function tagExists(tag: string): Promise<boolean> {
  const result = await run('git', ['tag', '-l', tag], {
    stdio: 'pipe',
    reject: false,
  })

  return result.stdout.trim() === tag
}

export async function commitAndTag(params: {
  version: string
  dryRun: boolean
  skipGit: boolean
}): Promise<void> {
  if (params.skipGit) {
    console.log(colors.yellow('skipGit enabled; not committing or tagging.'))
    return
  }

  const status = await gitStatus()
  const tag = `v${params.version}`

  if (status) {
    await run('git', ['add', '-A'], { dryRun: params.dryRun })
    await run('git', ['commit', '-m', `release: ${tag}`], {
      dryRun: params.dryRun,
    })
  }

  if (await tagExists(tag)) {
    throw new Error(`Tag already exists: ${tag}`)
  }

  await run('git', ['tag', tag], { dryRun: params.dryRun })
  await run('git', ['push'], { dryRun: params.dryRun })
  await run('git', ['push', 'origin', tag], { dryRun: params.dryRun })
}
```

---

# 10. 新增 `packages/release/src/workspace/version.ts`

```ts
import type {
  PackageJsonLike,
  ReleaseConfig,
  ReleasePackage,
  VersionPackagesOptions,
} from './types'

import semver from 'semver'

import { readJson, writeJson } from './fs'
import { listPublishablePackages } from './packages'

function sortPackageJson(pkg: PackageJsonLike): PackageJsonLike {
  const preferred = [
    'name',
    'type',
    'version',
    'description',
    'license',
    'repository',
    'publishConfig',
    'sideEffects',
    'exports',
    'bin',
    'files',
    'scripts',
    'peerDependencies',
    'peerDependenciesMeta',
    'dependencies',
    'devDependencies',
    'optionalDependencies',
  ]

  const result: PackageJsonLike = {}

  for (const key of preferred) {
    if (key in pkg) result[key] = pkg[key]
  }

  for (const key of Object.keys(pkg).sort()) {
    if (!(key in result)) result[key] = pkg[key]
  }

  return result
}

export function defaultVersionPackage(
  pkg: PackageJsonLike,
  ctx: {
    version: string
    releasePackage: ReleasePackage
    config: ReleaseConfig
  },
): PackageJsonLike {
  return sortPackageJson({
    ...pkg,
    version: ctx.version,
    repository: {
      type: 'git',
      url: ctx.config.repositoryUrl,
      directory: ctx.releasePackage.relativeDir,
    },
    publishConfig: {
      ...(pkg.publishConfig ?? {}),
      access: ctx.config.publish?.access ?? 'public',
      provenance: ctx.config.publish?.provenance ?? true,
      ...(ctx.config.publish?.registry
        ? { registry: ctx.config.publish.registry }
        : {}),
    },
  })
}

export async function versionPackages(
  config: ReleaseConfig,
  options: VersionPackagesOptions,
): Promise<void> {
  if (!semver.valid(options.version)) {
    throw new Error(`Invalid semver version: ${options.version}`)
  }

  const packages = listPublishablePackages(config)

  for (const releasePackage of packages) {
    const current = readJson<PackageJsonLike>(releasePackage.packageJsonPath)
    const next = config.versionPackage
      ? config.versionPackage(current, {
          version: options.version,
          releasePackage,
          config,
        })
      : defaultVersionPackage(current, {
          version: options.version,
          releasePackage,
          config,
        })

    if (options.dryRun) {
      console.log(`would version ${releasePackage.name} -> ${options.version}`)
      continue
    }

    await writeJson(releasePackage.packageJsonPath, next)
  }

  await config.afterVersion?.({
    version: options.version,
    config,
  })
}

function parseVersionCliArgs(args: string[]): VersionPackagesOptions {
  let version = ''
  let dryRun = false

  for (const arg of args) {
    if (arg === '--dry-run' || arg === '--dry') {
      dryRun = true
      continue
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    }

    if (!version) {
      version = arg
      continue
    }

    throw new Error(`Unexpected argument: ${arg}`)
  }

  if (!version) {
    throw new Error('Usage: version:packages <version> [--dry-run]')
  }

  return {
    version,
    dryRun,
  }
}

export async function runVersionPackagesCli(
  config: ReleaseConfig,
): Promise<void> {
  await versionPackages(config, parseVersionCliArgs(process.argv.slice(2)))
}
```

---

# 11. 新增 `packages/release/src/workspace/readiness.ts`

```ts
import type { CheckResult, ReleaseConfig, ReleasePackage } from './types'

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import colors from 'picocolors'

import { getUniqueVersions, listPublishablePackages } from './packages'

function hasExport(pkg: ReleasePackage, key: string): boolean {
  return Boolean(pkg.packageJson.exports && key in pkg.packageJson.exports)
}

function hasFile(pkg: ReleasePackage, file: string): boolean {
  return (
    Array.isArray(pkg.packageJson.files) && pkg.packageJson.files.includes(file)
  )
}

function hasDist(pkg: ReleasePackage, path: string): boolean {
  return existsSync(resolve(pkg.dir, path.replace(/^\.\//, '')))
}

function checkCommon(
  config: ReleaseConfig,
  pkg: ReleasePackage,
  errors: string[],
): void {
  if (!pkg.name.startsWith('@')) {
    errors.push(`${pkg.name}: scoped package name is recommended`)
  }

  if (!pkg.packageJson.description) {
    errors.push(`${pkg.name}: description is required`)
  }

  if (!pkg.packageJson.license) {
    errors.push(`${pkg.name}: license is required`)
  }

  if (!pkg.packageJson.exports) {
    errors.push(`${pkg.name}: exports is required`)
  }

  if (!hasFile(pkg, 'dist')) {
    errors.push(`${pkg.name}: files must include dist`)
  }

  if (!pkg.packageJson.scripts?.build) {
    errors.push(`${pkg.name}: scripts.build is required`)
  }

  if (!pkg.packageJson.scripts?.check && !pkg.packageJson.scripts?.typecheck) {
    errors.push(`${pkg.name}: scripts.check or scripts.typecheck is required`)
  }

  if (!hasDist(pkg, 'dist')) {
    errors.push(`${pkg.name}: dist missing`)
  }

  if (config.readiness?.strict) {
    const repository = pkg.packageJson.repository

    if (
      !repository ||
      typeof repository === 'string' ||
      repository.type !== 'git' ||
      repository.url !== config.repositoryUrl ||
      repository.directory !== pkg.relativeDir
    ) {
      errors.push(
        `${pkg.name}: repository must point to ${config.repositoryUrl} and ${pkg.relativeDir}`,
      )
    }

    if (
      !pkg.packageJson.publishConfig ||
      pkg.packageJson.publishConfig.access !==
        (config.publish?.access ?? 'public') ||
      pkg.packageJson.publishConfig.provenance !==
        (config.publish?.provenance ?? true)
    ) {
      errors.push(`${pkg.name}: publishConfig is invalid`)
    }
  }
}

function checkZeusWebPrimitive(pkg: ReleasePackage, errors: string[]): void {
  if (pkg.kind !== 'primitive') return

  for (const key of [
    '.',
    './wc',
    './react',
    './vue',
    './vue/global',
    './custom-elements.json',
    './zeus.components.json',
  ]) {
    if (!hasExport(pkg, key)) {
      errors.push(`${pkg.name}: missing export ${key}`)
    }
  }
}

function checkZeusWebIcons(pkg: ReleasePackage, errors: string[]): void {
  if (pkg.kind !== 'icons') return

  for (const key of [
    '.',
    './react',
    './vue',
    './wc',
    './manifest.json',
    './svg/*',
  ]) {
    if (!hasExport(pkg, key)) {
      errors.push(`${pkg.name}: missing export ${key}`)
    }
  }
}

export function checkReleaseReadiness(config: ReleaseConfig): CheckResult {
  const errors: string[] = []
  const warnings: string[] = []
  const packages = listPublishablePackages(config)
  const versions = getUniqueVersions(packages)

  if (packages.length === 0) {
    errors.push('No publishable packages found.')
  }

  if (versions.length > 1) {
    errors.push(
      `All packages must share the same version. Found: ${versions.join(', ')}`,
    )
  }

  if (!config.readiness?.allowZero && versions.includes('0.0.0')) {
    errors.push('0.0.0 is not allowed for release')
  }

  for (const pkg of packages) {
    if (config.readiness?.common !== false) {
      checkCommon(config, pkg, errors)
    }

    checkZeusWebPrimitive(pkg, errors)
    checkZeusWebIcons(pkg, errors)

    const customErrors = config.readiness?.package?.(pkg) ?? []
    errors.push(...customErrors)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

function parseReadinessArgs(
  args: string[],
  config: ReleaseConfig,
): ReleaseConfig {
  const next: ReleaseConfig = {
    ...config,
    readiness: {
      ...config.readiness,
    },
  }

  for (const arg of args) {
    if (arg === '--strict') {
      next.readiness!.strict = true
      continue
    }

    if (arg === '--allow-zero') {
      next.readiness!.allowZero = true
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return next
}

export async function runReadinessCli(config: ReleaseConfig): Promise<void> {
  const next = parseReadinessArgs(process.argv.slice(2), config)
  const result = checkReleaseReadiness(next)

  for (const warning of result.warnings) {
    console.log(colors.yellow(`- ${warning}`))
  }

  if (!result.valid) {
    console.error(colors.red('Release readiness check failed:'))

    for (const error of result.errors) {
      console.error(`- ${error}`)
    }

    process.exit(1)
  }

  console.log(colors.green('Release readiness check passed.'))
}
```

---

# 12. 新增 `packages/release/src/workspace/precheck.ts`

```ts
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

  await run('pnpm', [
    'release:verify',
    ...(options.strict ? ['--strict'] : []),
    ...(options.allowZero ? ['--allow-zero'] : []),
  ])
}

export async function runPrecheckCli(config: ReleaseConfig): Promise<void> {
  await runPrecheck(config, parsePrecheckArgs(process.argv.slice(2)))
}
```

---

# 13. 新增 `packages/release/src/workspace/plan.ts`

```ts
import type { ReleaseConfig, ReleasePlan } from './types'

import colors from 'picocolors'

import { listPublishablePackages, getUniqueVersions } from './packages'
import { npmVersionExists, resolveDistTag } from './npm'

interface PlanOptions {
  json: boolean
  checkNpm: boolean
  tag?: string
  version?: string
}

function parsePlanArgs(args: string[]): PlanOptions {
  const options: PlanOptions = {
    json: false,
    checkNpm: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--json') {
      options.json = true
      continue
    }

    if (arg === '--check-npm') {
      options.checkNpm = true
      continue
    }

    if (arg === '--tag' || arg === '--version') {
      const value = args[index + 1]
      if (!value) throw new Error(`${arg} requires a value`)
      if (arg === '--tag') options.tag = value
      if (arg === '--version') options.version = value
      index += 1
      continue
    }

    if (arg.startsWith('--tag=')) {
      options.tag = arg.slice('--tag='.length)
      continue
    }

    if (arg.startsWith('--version=')) {
      options.version = arg.slice('--version='.length)
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return options
}

export async function createReleasePlan(
  config: ReleaseConfig,
  options: PlanOptions,
): Promise<ReleasePlan> {
  const packages = listPublishablePackages(config)
  const versions = getUniqueVersions(packages)

  if (versions.length !== 1) {
    throw new Error(
      `Release plan requires one shared version. Found: ${versions.join(', ')}`,
    )
  }

  const version = options.version ?? versions[0]

  if (version !== versions[0]) {
    throw new Error(
      `Requested version ${version} does not match package version ${versions[0]}`,
    )
  }

  const tag = resolveDistTag(version, options.tag)

  return {
    version,
    tag,
    packages: await Promise.all(
      packages.map(async pkg => ({
        name: pkg.name,
        version: pkg.version,
        directory: pkg.relativeDir,
        npmExists: options.checkNpm ? await npmVersionExists(pkg) : undefined,
      })),
    ),
  }
}

export async function runReleasePlanCli(config: ReleaseConfig): Promise<void> {
  const options = parsePlanArgs(process.argv.slice(2))
  const plan = await createReleasePlan(config, options)

  if (options.json) {
    console.log(JSON.stringify(plan, null, 2))
    return
  }

  console.log(colors.bold(`Release plan: ${plan.version} (${plan.tag})`))

  for (const item of plan.packages) {
    const status =
      item.npmExists === undefined
        ? ''
        : item.npmExists
          ? colors.yellow(' already exists')
          : colors.green(' new')

    console.log(
      `  ${item.name}@${item.version} ${colors.gray(item.directory)}${status}`,
    )
  }
}
```

---

# 14. 新增 `packages/release/src/workspace/publish.ts`

```ts
import type { PublishOptions, ReleaseConfig } from './types'

import colors from 'picocolors'

import { getUniqueVersions, listPublishablePackages } from './packages'
import { publishOnePackage, resolveDistTag } from './npm'

function parsePublishArgs(args: string[]): PublishOptions {
  const options: PublishOptions = {
    dryRun: false,
    skipExisting: true,
    provenance: true,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--dry-run' || arg === '--dry') {
      options.dryRun = true
      continue
    }

    if (arg === '--no-skip-existing') {
      options.skipExisting = false
      continue
    }

    if (arg === '--no-provenance') {
      options.provenance = false
      continue
    }

    if (arg === '--tag' || arg === '--version') {
      const value = args[index + 1]
      if (!value) throw new Error(`${arg} requires a value`)
      if (arg === '--tag') options.tag = value
      if (arg === '--version') options.version = value
      index += 1
      continue
    }

    if (arg.startsWith('--tag=')) {
      options.tag = arg.slice('--tag='.length)
      continue
    }

    if (arg.startsWith('--version=')) {
      options.version = arg.slice('--version='.length)
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return options
}

export async function runPublish(
  config: ReleaseConfig,
  options: PublishOptions,
): Promise<void> {
  const packages = listPublishablePackages(config)
  const versions = getUniqueVersions(packages)

  if (versions.length !== 1) {
    throw new Error(
      `Publish requires one shared version. Found: ${versions.join(', ')}`,
    )
  }

  const version = options.version ?? versions[0]

  if (version !== versions[0]) {
    throw new Error(
      `Requested version ${version} does not match package version ${versions[0]}`,
    )
  }

  if (
    !options.dryRun &&
    !process.env.NODE_AUTH_TOKEN &&
    !process.env.NPM_TOKEN
  ) {
    throw new Error('NODE_AUTH_TOKEN or NPM_TOKEN is required for publish.')
  }

  const tag = resolveDistTag(version, options.tag)

  console.log(
    colors.bold(`Publishing ${packages.length} package(s) ${version} (${tag})`),
  )

  for (const pkg of packages) {
    await publishOnePackage(config, pkg, options)
  }
}

export async function runPublishCli(config: ReleaseConfig): Promise<void> {
  await runPublish(config, parsePublishArgs(process.argv.slice(2)))
}
```

---

# 15. 新增 `packages/release/src/workspace/changesets.ts`

```ts
import type { ReleaseConfig } from './types'

import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import semver from 'semver'

import { run } from './exec'
import { listPublishablePackages } from './packages'
import { readJson, writeJson } from './fs'
import type { PackageJsonLike } from './types'

function getBumpType(
  current: string,
  target: string,
): 'major' | 'minor' | 'patch' {
  const currentParsed = semver.parse(current)
  const targetParsed = semver.parse(target)

  if (!currentParsed || !targetParsed) return 'patch'
  if (targetParsed.major > currentParsed.major) return 'major'
  if (targetParsed.minor > currentParsed.minor) return 'minor'
  return 'patch'
}

export async function runChangesetsFixedVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  const cwd = config.cwd ?? process.cwd()
  const packages = listPublishablePackages(config)
  const fixed = config.fixedPackages ?? packages.map(pkg => pkg.name)
  const rootPackage =
    packages.find(pkg => pkg.name === config.rootVersionPackage) ?? packages[0]

  if (!rootPackage) {
    throw new Error('No package found for changesets release')
  }

  const bump = getBumpType(rootPackage.version, version)
  const changesetFile = resolve(
    cwd,
    config.changesetFile ?? '.changeset/release.md',
  )

  const body = [
    '---',
    ...fixed.map(name => `"${name}": ${bump}`),
    '---',
    '',
    `Release v${version}`,
    '',
  ].join('\n')

  writeFileSync(changesetFile, body)

  await run('pnpm', ['changeset', 'version'], {
    cwd,
  })

  await forceWorkspaceVersion(config, version)

  cleanupPackageChangelogs(config)
}

export async function forceWorkspaceVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  for (const pkg of listPublishablePackages(config)) {
    const json = readJson<PackageJsonLike>(pkg.packageJsonPath)
    json.version = version
    await writeJson(pkg.packageJsonPath, json)
  }
}

function cleanupPackageChangelogs(config: ReleaseConfig): void {
  for (const pkg of listPublishablePackages(config)) {
    const changelog = resolve(pkg.dir, 'CHANGELOG.md')
    if (existsSync(changelog)) rmSync(changelog)
  }

  const cwd = config.cwd ?? process.cwd()
  const changesetDir = resolve(cwd, '.changeset')

  if (existsSync(changesetDir)) {
    for (const file of readdirSync(changesetDir)) {
      if (file.endsWith('.md') && file !== 'README.md') {
        rmSync(resolve(changesetDir, file))
      }
    }
  }
}
```

---

# 16. 新增 `packages/release/src/workspace/release.ts`

```ts
import type { ReleaseConfig, ReleaseOptions } from './types'

import semver from 'semver'
import colors from 'picocolors'

import { commitAndTag, assertCleanGit } from './git'
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
      options.tag = arg.slice('--tag='.length)
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
  dryRun: boolean,
) {
  if (config.mode === 'changesets-fixed') {
    await runChangesetsFixedVersion(config, version)
    return
  }

  await versionPackages(config, {
    version,
    dryRun,
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

  await prepareVersion(config, version, options.dryRun)

  await run(config.packageManager ?? 'pnpm', ['install', '--lockfile-only'], {
    cwd: config.cwd,
    dryRun: options.dryRun,
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
```

---

# 17. 新增 `packages/release/src/workspace/canary.ts`

```ts
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
  return {
    forceLocal: args.includes('--force-local'),
  }
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

  await run('curl', [
    '--fail-with-body',
    '-X',
    'POST',
    '-H',
    'Accept: application/vnd.github+json',
    '-H',
    `Authorization: Bearer ${token}`,
    '-H',
    'X-GitHub-Api-Version: 2022-11-28',
    `https://api.github.com/repos/${dispatch.repository}/dispatches`,
    '-d',
    JSON.stringify({
      event_type: dispatch.eventType,
      client_payload: payload,
    }),
  ])
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
```

---

# 18. `zeus` 接入方式

## `zeus/scripts/release.config.ts`

```ts
import { defineReleaseConfig } from '@baicie/release'

const fixedPackages = [
  '@zeus-js/shared',
  '@zeus-js/signal',
  '@zeus-js/runtime-dom',
  '@zeus-js/compiler',
  '@zeus-js/zeus',
  '@zeus-js/bundler-plugin',
  '@zeus-js/component-analyzer',
  '@zeus-js/component-dts',
  '@zeus-js/output-wc',
  '@zeus-js/output-react-wrapper',
  '@zeus-js/output-vue-wrapper',
  '@zeus-js/output-css',
  '@zeus-js/output-icons',
]

export default defineReleaseConfig({
  repo: 'baicie/zeus',
  repositoryUrl: 'https://github.com/baicie/zeus.git',
  mode: 'changesets-fixed',
  packageManager: 'pnpm',
  workspace: {
    roots: ['packages/core', 'packages/bundler', 'packages/web-c'],
    include: fixedPackages,
  },
  fixedPackages,
  rootVersionPackage: '@zeus-js/zeus',
  changesetFile: '.changeset/release.md',
  changelogFile: 'CHANGELOG.md',
  publish: {
    access: 'public',
    provenance: true,
    skipExisting: true,
    retry: 5,
  },
  precheck: {
    commands: [
      ['pnpm', ['check:branch']],
      ['pnpm', ['build']],
      ['pnpm', ['check:compiler-cjs']],
      ['pnpm', ['build-dts']],
      ['pnpm', ['api:check']],
      ['pnpm', ['check']],
      ['pnpm', ['lint']],
      ['pnpm', ['test-unit']],
      ['pnpm', ['examples:check:all']],
      ['pnpm', ['bench:component-host:ci']],
      ['pnpm', ['docs:build']],
      ['pnpm', ['size:ci']],
      ['pnpm', ['check:exports']],
      ['pnpm', ['check:repository']],
    ],
  },
  readiness: {
    common: true,
    strict: true,
    package(pkg) {
      const errors: string[] = []

      if (!pkg.name.startsWith('@zeus-js/')) {
        errors.push(`${pkg.name}: must use @zeus-js scope`)
      }

      return errors
    },
  },
  canary: {
    enabled: true,
    prefix: 'canary',
    tag: 'canary',
    envName: 'ZEUS_CANARY_VERSION',
    dispatch: {
      tokenEnv: 'ZEUS_UI_DISPATCH_TOKEN',
      repository: 'baicie/zeus-ui',
      eventType: 'zeus-canary-published',
      payload: ({ version, sha }) => ({
        source: 'zeus',
        sha,
        version,
      }),
    },
  },
})
```

## zeus thin scripts

```ts
// scripts/release/release.ts
import { runReleaseCli } from '@baicie/release'
import config from '../release.config'

await runReleaseCli(config)
```

```ts
// scripts/release/release-precheck.ts
import { runPrecheckCli } from '@baicie/release'
import config from '../release.config'

await runPrecheckCli(config)
```

```ts
// scripts/release/release-canary.ts
import { runCanaryCli } from '@baicie/release'
import config from '../release.config'

await runCanaryCli(config)
```

```ts
// scripts/release/publish.ts
import { runPublishCli } from '@baicie/release'
import config from '../release.config'

await runPublishCli(config)
```

```ts
// scripts/release/release-plan.ts
import { runReleasePlanCli } from '@baicie/release'
import config from '../release.config'

await runReleasePlanCli(config)
```

---

# 19. `zeus-ui` 接入方式

## `zeus-ui/scripts/release.config.ts`

```ts
import { defineReleaseConfig } from '@baicie/release'

export default defineReleaseConfig({
  repo: 'baicie/zeus-ui',
  repositoryUrl: 'https://github.com/baicie/zeus-ui.git',
  mode: 'workspace-fixed',
  packageManager: 'pnpm',
  workspace: {
    roots: ['packages', 'packages/primitives'],
    packageKind(relativeDir, pkg) {
      if (relativeDir.startsWith('packages/primitives/')) return 'primitive'
      if (pkg.name === '@zeus-web/icons') return 'icons'
      if (pkg.name === '@zeus-web/cli') return 'cli'
      return undefined
    },
  },
  publish: {
    access: 'public',
    provenance: true,
    skipExisting: true,
    retry: 5,
  },
  precheck: {
    commands: [
      ['pnpm', ['format-check']],
      ['pnpm', ['lint']],
      ['pnpm', ['test']],
      ['pnpm', ['check']],
      ['pnpm', ['build']],
      ['pnpm', ['check:exports']],
      ['pnpm', ['check:build-output']],
      ['pnpm', ['site:check']],
    ],
  },
  readiness: {
    common: true,
    strict: true,
    package(pkg) {
      const errors: string[] = []

      if (!pkg.name.startsWith('@zeus-web/')) {
        errors.push(`${pkg.name}: must use @zeus-web scope`)
      }

      if (pkg.kind === 'cli') {
        const bin = pkg.packageJson.bin
        if (!bin || bin.zweb !== './dist/index.js') {
          errors.push(`${pkg.name}: bin.zweb must be ./dist/index.js`)
        }
      }

      return errors
    },
  },
  canary: {
    enabled: true,
    prefix: 'canary',
    tag: 'canary',
    envName: 'ZEUS_WEB_CANARY_VERSION',
  },
})
```

## zeus-ui thin scripts

```ts
// scripts/release/release.ts
import { runReleaseCli } from '@baicie/release'
import config from '../release.config'

await runReleaseCli(config)
```

```ts
// scripts/release/release-precheck.ts
import { runPrecheckCli } from '@baicie/release'
import config from '../release.config'

await runPrecheckCli(config)
```

```ts
// scripts/release/version-packages.ts
import { runVersionPackagesCli } from '@baicie/release'
import config from '../release.config'

await runVersionPackagesCli(config)
```

```ts
// scripts/release/release-plan.ts
import { runReleasePlanCli } from '@baicie/release'
import config from '../release.config'

await runReleasePlanCli(config)
```

```ts
// scripts/release/publish.ts
import { runPublishCli } from '@baicie/release'
import config from '../release.config'

await runPublishCli(config)
```

```ts
// scripts/release/release-canary.ts
import { runCanaryCli } from '@baicie/release'
import config from '../release.config'

await runCanaryCli(config)
```

```ts
// scripts/checks/check-release-readiness.ts
import { runReadinessCli } from '@baicie/release'
import config from '../release.config'

await runReadinessCli(config)
```

---

# 20. 两个仓库的 package scripts

## zeus

```json
{
  "scripts": {
    "release": "tsx scripts/release/release.ts",
    "release:publishOnly": "tsx scripts/release/release.ts --publishOnly",
    "release:precheck": "tsx scripts/release/release-precheck.ts",
    "release:plan": "tsx scripts/release/release-plan.ts",
    "release:dry": "tsx scripts/release/release.ts --dry --skipGit",
    "release:canary": "tsx scripts/release/release-canary.ts"
  }
}
```

## zeus-ui

```json
{
  "scripts": {
    "release": "tsx scripts/release/release.ts",
    "release:publishOnly": "tsx scripts/release/release.ts --publishOnly",
    "release:precheck": "tsx scripts/release/release-precheck.ts",
    "release:plan": "tsx scripts/release/release-plan.ts",
    "release:verify": "tsx scripts/checks/check-release-readiness.ts",
    "release:dry": "tsx scripts/release/release.ts --dry --skipGit",
    "release:canary": "tsx scripts/release/release-canary.ts",
    "version:packages": "tsx scripts/release/version-packages.ts",
    "ci-publish": "tsx scripts/release/publish.ts"
  }
}
```

---

# 21. GitHub Actions 统一模板

## `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

concurrency:
  group: release
  cancel-in-progress: false

env:
  PUPPETEER_SKIP_DOWNLOAD: 'true'

jobs:
  release:
    runs-on: ubuntu-latest

    permissions:
      contents: write
      id-token: write

    environment: Release

    steps:
      - uses: actions/checkout@v5

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v5
        with:
          node-version-file: .node-version
          registry-url: https://registry.npmjs.org
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Extract version
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          echo "VERSION=$VERSION" >> $GITHUB_ENV

      - run: pnpm release:precheck --strict

      - run: pnpm release:publishOnly ${{ env.VERSION }} --skipBuild
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## `.github/workflows/release-canary.yml`

```yaml
name: Release Canary

on:
  workflow_dispatch:
  push:
    branches:
      - main
      - feat/**
      - fix/**
      - refactor/**
      - chore/**
      - release/**
      - hotfix/**

concurrency:
  group: release-canary-${{ github.ref }}
  cancel-in-progress: false

env:
  PUPPETEER_SKIP_DOWNLOAD: 'true'

jobs:
  release-canary:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    environment: Canary

    steps:
      - uses: actions/checkout@v5

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v5
        with:
          node-version-file: .node-version
          registry-url: https://registry.npmjs.org
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm release:canary
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          ZEUS_UI_DISPATCH_TOKEN: ${{ secrets.ZEUS_UI_DISPATCH_TOKEN }}
```

---

# 最终收益

抽完以后：

```txt
tools/@baicie/release：
  负责 release 核心能力

zeus：
  只维护 release.config.ts
  保留 changeset fixed group 行为

zeus-ui：
  只维护 release.config.ts
  保留 workspace fixed + readiness gate 行为

两个仓库：
  release/publish/canary/precheck/tag/publishOnly 行为一致
```

建议分三步落地：

```txt
PR 1: tools/packages/release 增加 workspace release kit，保留旧 API。
PR 2: zeus 接入 @baicie/release workspace API，删除本地大段 release 脚本。
PR 3: zeus-ui 接入 @baicie/release workspace API，删除本地大段 release 脚本。
```

对应分支名：

```txt
feat/release-kit
refactor/zeus-release-kit
refactor/zeus-ui-release-kit
```
