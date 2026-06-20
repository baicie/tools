export declare function generateChangelog(options: {
  /** @example () => `packages/${pkgName}` */
  getPkgDir: () => string
  /** @example `${pkgName}@` */
  tagPrefix?: string
}): Promise<void>

export declare function publish(options: {
  defaultPackage?: string
  getPkgDir?: (pkg: string) => string
  /**
   * Enables npm package provenance https://docs.npmjs.com/generating-provenance-statements
   * @default false
   */
  provenance?: boolean
  /**
   * Package manager that runs the publish command
   * @default "npm"
   */
  packageManager?: 'npm' | 'pnpm'
}): Promise<void>

export declare function release(options: {
  repo: string
  packages: string[]
  linkedPackages?: Record<string, string[]>
  logChangelog?: (pkg: string) => void | Promise<void>
  generateChangelog?: (pkg: string, version: string) => void | Promise<void>
  toTag: (pkg: string, version: string) => string
  getPkgDir?: (pkg: string) => string
  /**
   * 同步到 app.json 的版本相关字段。
   * 启用后会在 release() 末尾写入 app.json 的 expo.version，
   * 可选同步 expo.android.versionCode 与 ios.buildNumber。
   */
  appJson?: {
    enabled?: boolean
    file?: string
    versionNameStrategy?: 'exact' | 'strip-prerelease'
    versionCode?: number | 'auto'
    writeIosBuildNumber?: boolean
  }
}): Promise<void>
