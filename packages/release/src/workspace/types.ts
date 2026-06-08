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
