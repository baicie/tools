export interface CleanOptions {
  /** Target directory to clean, defaults to cwd */
  root?: string
  /** Whether to show detailed progress */
  verbose?: boolean
  /** Dry run mode - only show what would be deleted */
  dry?: boolean
  /** Targets to clean: 'node_modules', 'target', or both. Defaults to both */
  targets?: Array<'node_modules' | 'target'>
}

export interface CleanResult {
  /** Total number of directories removed */
  count: number
  /** Total space recovered in bytes */
  spaceSaved: number
  /** List of removed paths */
  removed: string[]
}

export interface TargetInfo {
  path: string
  size: number
  isSymlink: boolean
}
