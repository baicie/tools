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

  /**
   * Undefined means use config.publish.skipExisting.
   */
  skipExisting?: boolean

  /**
   * Undefined means use config.publish.provenance.
   */
  provenance?: boolean
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
