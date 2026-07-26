下面这版我建议直接把 `@baicie/release` 从“已有 workspace API 雏形”升级成 **Zeus / Zeus-UI 都能复用的配置驱动 release kit**。

我看了当前 `tools` 代码：`@baicie/release` 已经保留旧 API，并导出 workspace API，如 `release / publish / generateChangelog` 以及 `runReleaseCli / runPublishCli / runCanaryCli` 等。 当前 `ReleaseMode` 也已经有 `changesets-fixed | workspace-fixed` 两种模式。 但它离 Zeus 文档里的完整流程还差几个关键点：文档要求本地 `pnpm release` 负责选择版本、确认 changelog、commit/tag/push，CI 再 `--publishOnly --skipBuild` 发布；同时还要求解析 changeset、统一根 `CHANGELOG.md`、清理包级 changelog、读取 fixed/ignore、按版本自动选择 npm tag、重试发布、canary 发版。

## 结论

当前代码可以保留，但需要改造这几块：

1. **保留旧 API 不动**：`release()`、`publish()`、`generateChangelog()` 继续导出，不影响别的包使用。
2. **workspace API 继续沿用**：`defineReleaseConfig()`、`runReleaseCli()`、`runPublishCli()` 等保持现有入口。
3. **增强 changesets-fixed 模式**：
   - 自动读取 `.changeset/config.json` 的 `fixed` 和 `ignore`。
   - 读取真实 changeset md，用于生成根 `CHANGELOG.md`。
   - 执行 `pnpm changeset version` 后，强制 fixed 组版本统一。
   - 清理包级 `CHANGELOG.md`。
   - 更新根 `package.json` 版本。

4. **增强 publishOnly / npm publish**：
   - 支持 `--registry`。
   - 跳过已发布版本。
   - 支持 npm tag 自动推断：`alpha / beta / rc / canary / latest`。
   - `--provenance` 只在 CI 且有 OIDC token 时启用，避免本地或无 OIDC 环境炸。

5. **precheck 不再强塞 `pnpm release:verify`**：Zeus 的 13 项门禁应该全部由 config 配置。
6. **canary 支持完整 Zeus 流程**：
   - 生成 `{baseVersion}-canary.{date}.{runNumber}.{runAttempt}.{sha}`。
   - 写入 `GITHUB_ENV`。
   - 更新包版本和 lockfile。
   - precheck。
   - dry-run publish。
   - 正式 publish。
   - 可选触发 zeus-ui dispatch。

---

# 改造后的目录

```txt
packages/release/src/
  index.ts                         # 保持兼容，导出旧 API + workspace API
  release.ts                       # 旧 API，不动
  publish.ts                       # 旧 API，不动
  changelog.ts                     # 旧 API，不动
  workspace/
    index.ts
    types.ts
    config.ts
    fs.ts
    exec.ts
    git.ts
    packages.ts
    npm.ts
    changesets.ts
    changelog.ts
    version.ts
    precheck.ts
    publish.ts
    plan.ts
    release.ts
    canary.ts
```

---

# 1. `packages/release/src/index.ts`

保持当前兼容方式即可。当前代码已经符合方向。

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

# 2. `packages/release/src/workspace/index.ts`

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

# 3. `packages/release/src/workspace/types.ts`

```ts
export type ReleaseMode = 'changesets-fixed' | 'workspace-fixed'

export type ReleaseVersionBump =
  | 'major'
  | 'minor'
  | 'patch'
  | 'premajor'
  | 'preminor'
  | 'prepatch'
  | 'prerelease'

export interface PackageJsonLike {
  name?: string
  private?: boolean
  version?: string
  description?: string
  license?: string
  type?: string
  files?: string[]
  exports?: Record<string, unknown>
  bin?: Record<string, string> | string
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

  /**
   * 发布包过滤。
   * Zeus 用：pkg => pkg.name.startsWith('@zeus-js/')
   */
  publishable?: (pkg: ReleasePackage) => boolean
}

export interface ParsedChangesetRelease {
  name: string
  type: 'major' | 'minor' | 'patch' | 'none'
}

export interface ParsedChangeset {
  id: string
  file: string
  summary: string
  releases: ParsedChangesetRelease[]
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

  /**
   * 老字段保留。
   * 不传时 changesets-fixed 会从 .changeset/config.json fixed 读取。
   */
  fixedPackages?: string[]

  /**
   * 老字段保留，作为 synthetic changeset 文件路径。
   */
  changesetFile?: string

  /**
   * 用哪个包版本作为 base version。
   */
  rootVersionPackage?: string

  /**
   * 根 package.json 文件。默认 package.json。
   * 如果不希望更新根版本，传 false。
   */
  rootPackageJson?: string | false

  /**
   * 根 changelog。默认 CHANGELOG.md。
   */
  changelogFile?: string | false

  changesets?: {
    configFile?: string
    releaseFile?: string
    requireChangeset?: boolean
    readIgnore?: boolean
    readFixed?: boolean
    cleanupPackageChangelogs?: boolean
    unifiedChangelog?: boolean
  }

  publish?: {
    access?: 'public' | 'restricted'
    provenance?: boolean
    registry?: string
    skipExisting?: boolean
    retry?: number
  }

  precheck?: {
    /**
     * 完整质量门禁命令列表。
     * Zeus 直接放 13 项即可。
     */
    commands?: string[][]

    /**
     * 兼容旧行为。默认不再自动追加 pnpm release:verify。
     */
    verifyCommand?: string[] | false
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
  bump?: ReleaseVersionBump
  preid?: string
  tag?: string
  registry?: string
  dryRun: boolean
  skipGit: boolean
  skipPrecheck: boolean
  skipBuild: boolean
  skipPrompts: boolean
  publish: boolean
  publishOnly: boolean
}

export interface PublishOptions {
  version?: string
  tag?: string
  registry?: string
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

# 4. `packages/release/src/workspace/config.ts`

```ts
import type { ReleaseConfig } from './types'

export function defineReleaseConfig(config: ReleaseConfig): ReleaseConfig {
  return {
    ...config,
    packageManager: config.packageManager ?? 'pnpm',
    rootPackageJson:
      config.rootPackageJson === undefined
        ? 'package.json'
        : config.rootPackageJson,
    changelogFile:
      config.changelogFile === undefined
        ? 'CHANGELOG.md'
        : config.changelogFile,
    changesets: {
      configFile: '.changeset/config.json',
      releaseFile: config.changesetFile ?? '.changeset/release.md',
      requireChangeset: false,
      readIgnore: true,
      readFixed: true,
      cleanupPackageChangelogs: true,
      unifiedChangelog: true,
      ...(config.changesets ?? {}),
    },
    publish: {
      access: 'public',
      provenance: true,
      skipExisting: true,
      retry: 5,
      ...(config.publish ?? {}),
    },
    precheck: {
      commands: [],
      verifyCommand: false,
      ...(config.precheck ?? {}),
    },
    readiness: {
      common: true,
      allowZero: false,
      strict: false,
      ...(config.readiness ?? {}),
    },
  }
}
```

---

# 5. `packages/release/src/workspace/fs.ts`

```ts
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

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

export async function writeText(file: string, value: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, value, 'utf-8')
}
```

---

# 6. `packages/release/src/workspace/changesets.ts`

```ts
import type {
  PackageJsonLike,
  ParsedChangeset,
  ParsedChangesetRelease,
  ReleaseConfig,
} from './types'

import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import semver from 'semver'

import { readJson, readText, writeJson } from './fs'
import { run } from './exec'
import { generateUnifiedChangelog } from './changelog'
import { listPublishablePackages, listWorkspacePackages } from './packages'
import { normalizePackageJson } from './version'

interface ChangesetsConfig {
  fixed?: string[][]
  ignore?: string[]
  access?: 'public' | 'restricted'
}

function getChangesetsConfigPath(config: ReleaseConfig): string {
  return resolve(
    config.cwd ?? process.cwd(),
    config.changesets?.configFile ?? '.changeset/config.json',
  )
}

export function readChangesetsConfig(config: ReleaseConfig): ChangesetsConfig {
  const file = getChangesetsConfigPath(config)

  if (!existsSync(file)) {
    return {}
  }

  return readJson<ChangesetsConfig>(file)
}

export function getChangesetsIgnore(config: ReleaseConfig): string[] {
  if (config.changesets?.readIgnore === false) {
    return []
  }

  return readChangesetsConfig(config).ignore ?? []
}

export function getChangesetsFixedPackages(config: ReleaseConfig): string[] {
  if (config.fixedPackages?.length) {
    return config.fixedPackages
  }

  if (config.changesets?.readFixed === false) {
    return []
  }

  const fixed = readChangesetsConfig(config).fixed ?? []
  return Array.from(new Set(fixed.flat()))
}

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

function parseChangesetFrontmatter(value: string): {
  releases: ParsedChangesetRelease[]
  summary: string
} | null {
  const match = value.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)

  if (!match) {
    return null
  }

  const [, frontmatter, body] = match
  const releases: ParsedChangesetRelease[] = []

  for (const rawLine of frontmatter.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const release = line.match(/^['"]?(.+?)['"]?:\s*(major|minor|patch|none)$/)

    if (!release) {
      continue
    }

    releases.push({
      name: release[1],
      type: release[2] as ParsedChangesetRelease['type'],
    })
  }

  return {
    releases,
    summary: body.trim(),
  }
}

export function readChangesets(config: ReleaseConfig): ParsedChangeset[] {
  const cwd = config.cwd ?? process.cwd()
  const dir = resolve(cwd, '.changeset')

  if (!existsSync(dir)) {
    return []
  }

  const releaseFile = resolve(
    cwd,
    config.changesets?.releaseFile ??
      config.changesetFile ??
      '.changeset/release.md',
  )

  return readdirSync(dir)
    .filter(file => file.endsWith('.md'))
    .filter(file => file !== 'README.md')
    .map(file => resolve(dir, file))
    .filter(file => file !== releaseFile)
    .map(file => {
      const parsed = parseChangesetFrontmatter(readText(file))

      if (!parsed) {
        return undefined
      }

      return {
        id: file.split(/[\\/]/).pop()!.replace(/\.md$/, ''),
        file,
        ...parsed,
      }
    })
    .filter(Boolean) as ParsedChangeset[]
}

function createSyntheticReleaseChangeset(
  config: ReleaseConfig,
  version: string,
): string {
  const cwd = config.cwd ?? process.cwd()
  const packages = listPublishablePackages(config)
  const fixed = getChangesetsFixedPackages(config)

  const fixedPackages = fixed.length ? fixed : packages.map(pkg => pkg.name)
  const rootPackage =
    packages.find(pkg => pkg.name === config.rootVersionPackage) ?? packages[0]

  if (!rootPackage) {
    throw new Error('No package found for changesets release.')
  }

  const bump = getBumpType(rootPackage.version, version)

  const changesetFile = resolve(
    cwd,
    config.changesets?.releaseFile ??
      config.changesetFile ??
      '.changeset/release.md',
  )

  const body = [
    '---',
    ...fixedPackages.map(name => `"${name}": ${bump}`),
    '---',
    '',
    `Release v${version}`,
    '',
  ].join('\n')

  mkdir(dirname(changesetFile), { recursive: true })
  writeFileSync(changesetFile, body)

  return changesetFile
}

async function forceFixedGroupVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  const fixed = getChangesetsFixedPackages(config)

  if (!fixed.length) {
    return
  }

  const fixedSet = new Set(fixed)

  for (const pkg of listWorkspacePackages(config)) {
    if (!fixedSet.has(pkg.name)) continue

    const json = readJson<PackageJsonLike>(pkg.packageJsonPath)
    json.version = version

    await writeJson(
      pkg.packageJsonPath,
      normalizePackageJson(json, {
        config,
        releasePackage: pkg,
        version,
      }),
    )
  }
}

async function normalizePublishablePackages(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  for (const releasePackage of listPublishablePackages(config)) {
    const current = readJson<PackageJsonLike>(releasePackage.packageJsonPath)

    const next = config.versionPackage
      ? config.versionPackage(current, {
          version,
          releasePackage,
          config,
        })
      : normalizePackageJson(
          {
            ...current,
            version,
          },
          {
            version,
            releasePackage,
            config,
          },
        )

    await writeJson(releasePackage.packageJsonPath, next)
  }
}

async function updateRootPackageVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  if (config.rootPackageJson === false) {
    return
  }

  const cwd = config.cwd ?? process.cwd()
  const file = resolve(cwd, config.rootPackageJson ?? 'package.json')

  if (!existsSync(file)) {
    return
  }

  const json = readJson<PackageJsonLike>(file)
  json.version = version
  await writeJson(file, json)
}

function cleanupGeneratedReleaseFiles(
  config: ReleaseConfig,
  syntheticChangesetFile: string,
): void {
  if (config.changesets?.cleanupPackageChangelogs !== false) {
    for (const pkg of listWorkspacePackages(config)) {
      const changelog = resolve(pkg.dir, 'CHANGELOG.md')

      if (existsSync(changelog)) {
        rmSync(changelog)
      }
    }
  }

  if (existsSync(syntheticChangesetFile)) {
    rmSync(syntheticChangesetFile)
  }
}

export async function runChangesetsFixedVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  const changesets = readChangesets(config)

  if (
    (config.changesets?.requireChangeset ?? false) &&
    changesets.length === 0
  ) {
    throw new Error('No changeset found. Run `pnpm changeset` before release.')
  }

  const syntheticChangesetFile = createSyntheticReleaseChangeset(
    config,
    version,
  )

  await run(config.packageManager ?? 'pnpm', ['changeset', 'version'], {
    cwd: config.cwd,
  })

  await forceFixedGroupVersion(config, version)
  await normalizePublishablePackages(config, version)
  await updateRootPackageVersion(config, version)

  if (
    config.changelogFile !== false &&
    config.changesets?.unifiedChangelog !== false
  ) {
    await generateUnifiedChangelog(config, version, changesets)
  }

  cleanupGeneratedReleaseFiles(config, syntheticChangesetFile)

  await config.afterVersion?.({
    version,
    config,
  })
}
```

---

# 7. `packages/release/src/workspace/changelog.ts`

```ts
import type {
  ParsedChangeset,
  ParsedChangesetRelease,
  ReleaseConfig,
} from './types'

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { readText, writeText } from './fs'

function getHighestReleaseType(
  releases: ParsedChangesetRelease[],
): 'major' | 'minor' | 'patch' {
  if (releases.some(item => item.type === 'major')) return 'major'
  if (releases.some(item => item.type === 'minor')) return 'minor'
  return 'patch'
}

function sectionTitle(type: 'major' | 'minor' | 'patch'): string {
  switch (type) {
    case 'major':
      return 'Breaking Changes'
    case 'minor':
      return 'Features'
    case 'patch':
      return 'Fixes'
  }
}

function formatSummary(summary: string): string {
  const normalized = summary
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')

  return normalized || 'Release updates.'
}

function buildEntry(version: string, changesets: ParsedChangeset[]): string {
  const date = new Date().toISOString().slice(0, 10)

  const groups: Record<'major' | 'minor' | 'patch', string[]> = {
    major: [],
    minor: [],
    patch: [],
  }

  if (changesets.length === 0) {
    groups.patch.push(`Release v${version}.`)
  } else {
    for (const changeset of changesets) {
      const type = getHighestReleaseType(changeset.releases)
      groups[type].push(formatSummary(changeset.summary))
    }
  }

  const lines = [`## ${version} (${date})`, '']

  for (const type of ['major', 'minor', 'patch'] as const) {
    if (!groups[type].length) continue

    lines.push(`### ${sectionTitle(type)}`, '')

    for (const item of groups[type]) {
      lines.push(`- ${item}`)
    }

    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

function prependChangelog(existing: string, entry: string): string {
  if (!existing.trim()) {
    return `# Changelog\n\n${entry}\n`
  }

  const lines = existing.split(/\r?\n/)

  if (lines[0]?.startsWith('# ')) {
    return (
      [
        lines[0],
        '',
        entry,
        '',
        ...lines.slice(1).join('\n').trimStart().split(/\r?\n/),
      ]
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n'
    )
  }

  return `${entry}\n\n${existing.trimEnd()}\n`
}

export async function generateUnifiedChangelog(
  config: ReleaseConfig,
  version: string,
  changesets: ParsedChangeset[],
): Promise<void> {
  if (config.changelogFile === false) {
    return
  }

  const cwd = config.cwd ?? process.cwd()
  const file = resolve(cwd, config.changelogFile ?? 'CHANGELOG.md')
  const existing = existsSync(file) ? readText(file) : ''
  const entry = buildEntry(version, changesets)

  await writeText(file, prependChangelog(existing, entry))
}
```

---

# 8. `packages/release/src/workspace/packages.ts`

```ts
import type { PackageJsonLike, ReleaseConfig, ReleasePackage } from './types'

import { existsSync, readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'

import { readJson } from './fs'
import { getChangesetsIgnore } from './changesets'

function slash(value: string): string {
  return value.replace(/\\/g, '/')
}

function isIgnored(
  name: string,
  relativeDir: string,
  config: ReleaseConfig,
): boolean {
  const ignore = new Set([
    ...(config.workspace.ignore ?? []),
    ...getChangesetsIgnore(config),
  ])

  return ignore.has(name) || ignore.has(relativeDir)
}

function isIncluded(name: string, config: ReleaseConfig): boolean {
  const include = config.workspace.include

  if (!include || include.length === 0) return true

  return include.includes(name)
}

function collectPackageJsonFiles(root: string): string[] {
  const result: string[] = []

  function walk(dir: string): void {
    const packageJsonPath = resolve(dir, 'package.json')

    if (existsSync(packageJsonPath)) {
      result.push(packageJsonPath)
      return
    }

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (entry.name === 'node_modules') continue
      if (entry.name === 'dist') continue
      if (entry.name.startsWith('.')) continue

      walk(resolve(dir, entry.name))
    }
  }

  if (existsSync(root)) {
    walk(root)
  }

  return result
}

export function listWorkspacePackages(config: ReleaseConfig): ReleasePackage[] {
  const cwd = config.cwd ?? process.cwd()
  const packages: ReleasePackage[] = []
  const seen = new Set<string>()

  for (const root of config.workspace.roots) {
    const absoluteRoot = resolve(cwd, root)

    for (const packageJsonPath of collectPackageJsonFiles(absoluteRoot)) {
      const dir = resolve(packageJsonPath, '..')

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
  return listWorkspacePackages(config).filter(pkg => {
    if (pkg.isPrivate) return false
    if (config.workspace.publishable && !config.workspace.publishable(pkg))
      return false
    return true
  })
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

# 9. `packages/release/src/workspace/version.ts`

```ts
import type {
  PackageJsonLike,
  ReleaseConfig,
  ReleasePackage,
  VersionPackagesOptions,
} from './types'

import { resolve } from 'node:path'

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

export function normalizePackageJson(
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

export async function updateRootPackageVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  if (config.rootPackageJson === false) return

  const file = resolve(
    config.cwd ?? process.cwd(),
    config.rootPackageJson ?? 'package.json',
  )

  const json = readJson<PackageJsonLike>(file)
  json.version = version
  await writeJson(file, json)
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
      : normalizePackageJson(current, {
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

  if (!options.dryRun) {
    await updateRootPackageVersion(config, options.version)
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

# 10. `packages/release/src/workspace/npm.ts`

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
    message.includes('429') ||
    message.includes('5') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNRESET') ||
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
  return Boolean(
    options.provenance &&
    config.publish?.provenance &&
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

      console.log(colors.green(`published ${pkg.name}@${pkg.version}`))
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
```

---

# 11. `packages/release/src/workspace/precheck.ts`

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
```

---

# 12. `packages/release/src/workspace/publish.ts`

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

    if (arg === '--tag' || arg === '--version' || arg === '--registry') {
      const value = args[index + 1]
      if (!value) throw new Error(`${arg} requires a value`)

      if (arg === '--tag') options.tag = value
      if (arg === '--version') options.version = value
      if (arg === '--registry') options.registry = value

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

    if (arg.startsWith('--registry=')) {
      options.registry = arg.slice('--registry='.length)
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

# 13. `packages/release/src/workspace/release.ts`

```ts
import type { ReleaseConfig, ReleaseOptions, ReleaseVersionBump } from './types'

import semver from 'semver'
import colors from 'picocolors'
import prompts from 'prompts'

import { assertCleanGit, commitAndTag } from './git'
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
    skipPrompts: false,
    publish: false,
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

    if (arg === '--skipPrompts' || arg === '--yes' || arg === '-y') {
      options.skipPrompts = true
      continue
    }

    if (arg === '--publish') {
      options.publish = true
      continue
    }

    if (arg === '--publishOnly') {
      options.publishOnly = true
      continue
    }

    if (
      arg === '--tag' ||
      arg === '--preid' ||
      arg === '--registry' ||
      arg === '--bump'
    ) {
      const value = args[index + 1]
      if (!value) throw new Error(`${arg} requires a value`)

      if (arg === '--tag') options.tag = value
      if (arg === '--preid') options.preid = value
      if (arg === '--registry') options.registry = value
      if (arg === '--bump') options.bump = value as ReleaseVersionBump

      index += 1
      continue
    }

    if (arg.startsWith('--tag=')) {
      options.tag = arg.slice('--tag='.length)
      continue
    }

    if (arg.startsWith('--preid=')) {
      options.preid = arg.slice('--preid='.length)
      continue
    }

    if (arg.startsWith('--registry=')) {
      options.registry = arg.slice('--registry='.length)
      continue
    }

    if (arg.startsWith('--bump=')) {
      options.bump = arg.slice('--bump='.length) as ReleaseVersionBump
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

function incVersion(
  current: string,
  bump: ReleaseVersionBump,
  preid?: string,
): string {
  const next = semver.inc(current, bump, preid)

  if (!next) {
    throw new Error(`Cannot bump ${current} with ${bump}`)
  }

  return next
}

async function resolveReleaseVersion(
  config: ReleaseConfig,
  options: ReleaseOptions,
): Promise<string> {
  if (options.version) {
    if (!semver.valid(options.version)) {
      throw new Error(`Invalid version: ${options.version}`)
    }

    return options.version
  }

  const current = getSharedVersion(config)

  if (options.bump) {
    return incVersion(current, options.bump, options.preid)
  }

  if (options.skipPrompts || !process.stdin.isTTY) {
    throw new Error(
      'Version is required in non-interactive mode. Pass a version or --bump.',
    )
  }

  const choices = [
    {
      title: `patch ${incVersion(current, 'patch')}`,
      value: incVersion(current, 'patch'),
    },
    {
      title: `minor ${incVersion(current, 'minor')}`,
      value: incVersion(current, 'minor'),
    },
    {
      title: `major ${incVersion(current, 'major')}`,
      value: incVersion(current, 'major'),
    },
    {
      title: `beta ${incVersion(current, semver.prerelease(current) ? 'prerelease' : 'prepatch', 'beta')}`,
      value: incVersion(
        current,
        semver.prerelease(current) ? 'prerelease' : 'prepatch',
        'beta',
      ),
    },
    {
      title: 'custom',
      value: 'custom',
    },
  ]

  const response = await prompts([
    {
      type: 'select',
      name: 'version',
      message: `Current version is ${current}. Select next version`,
      choices,
    },
    {
      type: prev => (prev === 'custom' ? 'text' : null),
      name: 'customVersion',
      message: 'Input custom version',
      validate: value =>
        semver.valid(value) ? true : 'Invalid semver version',
    },
  ])

  const version =
    response.version === 'custom' ? response.customVersion : response.version

  if (!version || !semver.valid(version)) {
    throw new Error('Release cancelled or invalid version.')
  }

  return version
}

async function prepareVersion(
  config: ReleaseConfig,
  version: string,
): Promise<void> {
  if (config.mode === 'changesets-fixed') {
    await runChangesetsFixedVersion(config, version)
    return
  }

  await versionPackages(config, {
    version,
    dryRun: false,
  })
}

async function confirmRelease(
  version: string,
  options: ReleaseOptions,
): Promise<void> {
  if (options.skipPrompts || options.dryRun || !process.stdin.isTTY) {
    return
  }

  const response = await prompts({
    type: 'confirm',
    name: 'ok',
    message: `Release v${version}?`,
    initial: false,
  })

  if (!response.ok) {
    throw new Error('Release cancelled.')
  }
}

export async function runRelease(
  config: ReleaseConfig,
  options: ReleaseOptions,
): Promise<void> {
  if (options.registry) {
    config.publish = {
      ...(config.publish ?? {}),
      registry: options.registry,
    }
  }

  if (options.publishOnly) {
    if (!options.version) {
      throw new Error('Version is required when using --publishOnly')
    }

    if (!semver.valid(options.version)) {
      throw new Error(`Invalid version: ${options.version}`)
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
      registry: options.registry,
      dryRun: false,
      skipExisting: config.publish?.skipExisting ?? true,
      provenance: config.publish?.provenance ?? true,
    })

    return
  }

  const version = await resolveReleaseVersion(config, options)

  if (!options.dryRun && !options.skipGit) {
    await assertCleanGit()
  }

  await confirmRelease(version, options)

  await prepareVersion(config, version)

  await run(config.packageManager ?? 'pnpm', ['install', '--lockfile-only'], {
    cwd: config.cwd,
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
    registry: options.registry,
  })

  const tag = resolveDistTag(version, options.tag)

  if (options.dryRun) {
    await runPublish(config, {
      version,
      tag,
      registry: options.registry,
      dryRun: true,
      skipExisting: config.publish?.skipExisting ?? true,
      provenance: config.publish?.provenance ?? true,
    })

    console.log(colors.green('Release dry-run passed.'))
    console.log(
      colors.yellow(
        'Dry-run mutates version files, changelog and lockfile. Use git diff to inspect, then revert if needed.',
      ),
    )
    return
  }

  if (options.publish) {
    await runPublish(config, {
      version,
      tag,
      registry: options.registry,
      dryRun: false,
      skipExisting: config.publish?.skipExisting ?? true,
      provenance: config.publish?.provenance ?? true,
    })
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

# 14. `packages/release/src/workspace/plan.ts`

```ts
import type { ReleaseConfig, ReleasePlan } from './types'

import colors from 'picocolors'

import { getUniqueVersions, listPublishablePackages } from './packages'
import { npmVersionExists, resolveDistTag } from './npm'

interface PlanOptions {
  json: boolean
  checkNpm: boolean
  tag?: string
  version?: string
  registry?: string
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

    if (arg === '--tag' || arg === '--version' || arg === '--registry') {
      const value = args[index + 1]
      if (!value) throw new Error(`${arg} requires a value`)

      if (arg === '--tag') options.tag = value
      if (arg === '--version') options.version = value
      if (arg === '--registry') options.registry = value

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

    if (arg.startsWith('--registry=')) {
      options.registry = arg.slice('--registry='.length)
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
        npmExists: options.checkNpm
          ? await npmVersionExists(config, pkg, {
              registry: options.registry,
            })
          : undefined,
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

# 15. `packages/release/src/workspace/canary.ts`

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

# 16. Zeus 侧接入示例

新增：

```ts
// scripts/release/config.ts
import { defineReleaseConfig } from '@baicie/release'

export const releaseConfig = defineReleaseConfig({
  repo: 'baicie/zeus',
  repositoryUrl: 'https://github.com/baicie/zeus',
  mode: 'changesets-fixed',
  packageManager: 'pnpm',
  rootVersionPackage: '@zeus-js/zeus',

  workspace: {
    roots: [
      'packages/core',
      'packages/devtools',
      'packages/web-c',
      'packages/create',
      'examples',
      'benchmarks',
      'docs',
    ],
    publishable: pkg => pkg.name.startsWith('@zeus-js/'),
  },

  changesets: {
    configFile: '.changeset/config.json',
    releaseFile: '.changeset/release.md',
    requireChangeset: true,
    readFixed: true,
    readIgnore: true,
    cleanupPackageChangelogs: true,
    unifiedChangelog: true,
  },

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
      ['pnpm', ['docs:build']],
      ['pnpm', ['size:ci']],
      ['pnpm', ['check:exports']],
      ['pnpm', ['check:repository']],
    ],
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
        source: 'baicie/zeus',
        version,
        sha,
      }),
    },
  },
})
```

入口脚本：

```ts
// scripts/release/release.ts
import { runReleaseCli } from '@baicie/release'
import { releaseConfig } from './config'

await runReleaseCli(releaseConfig)
```

```ts
// scripts/release/release-precheck.ts
import { runPrecheckCli } from '@baicie/release'
import { releaseConfig } from './config'

await runPrecheckCli(releaseConfig)
```

```ts
// scripts/release/release-canary.ts
import { runCanaryCli } from '@baicie/release'
import { releaseConfig } from './config'

await runCanaryCli(releaseConfig)
```

```ts
// scripts/release/release-plan.ts
import { runReleasePlanCli } from '@baicie/release'
import { releaseConfig } from './config'

await runReleasePlanCli(releaseConfig)
```

```ts
// scripts/release/version-packages.ts
import { runVersionPackagesCli } from '@baicie/release'
import { releaseConfig } from './config'

await runVersionPackagesCli(releaseConfig)
```

根 `package.json`：

```json
{
  "scripts": {
    "release": "tsx scripts/release/release.ts",
    "release:publishOnly": "tsx scripts/release/release.ts --publishOnly",
    "release:precheck": "tsx scripts/release/release-precheck.ts",
    "release:dry": "tsx scripts/release/release.ts --dry --skipGit",
    "release:canary": "tsx scripts/release/release-canary.ts",
    "release:plan": "tsx scripts/release/release-plan.ts",
    "version:packages": "tsx scripts/release/version-packages.ts"
  }
}
```

---

# 自测顺序

```bash
# tools 仓库内
pnpm --filter @baicie/release typecheck
pnpm --filter @baicie/release test
pnpm --filter @baicie/release build

# zeus 仓库内
pnpm release:plan
pnpm release:dry

# 模拟 CI publishOnly
pnpm release --publishOnly 0.1.0-beta.5 --skipBuild --dry

# canary 本地 debug，只验证流程会改版本，不建议提交
NODE_AUTH_TOKEN=xxx pnpm release:canary --force-local
```

这版改造后，`@baicie/release` 可以同时承载：

```txt
zeus:
  changesets-fixed
  读取 .changeset/config.json fixed / ignore
  统一 CHANGELOG
  tag -> CI publishOnly

zeus-ui:
  workspace-fixed
  直接扫描 workspace 包
  统一写 version / repository / publishConfig
  readiness 强校验
  tag -> CI publishOnly
```

并且旧的 `release()`、`publish()`、`generateChangelog()` 不动，别的包继续按老 API 用。
