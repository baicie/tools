export type DocsDocumentType =
  | 'goal'
  | 'roadmap'
  | 'version'
  | 'phase-overview'
  | 'design'
  | 'detailed-design'
  | 'acceptance'
  | 'bug'
  | 'review'
  | 'decision'
  | 'retro'
  | 'ai-draft'
  | 'ai-context'

export type DocsDocumentStatus = 'draft' | 'active' | 'done' | 'archived'

export interface DocsManifestVersion {
  id: string
  title: string
  status: DocsDocumentStatus
}

export interface DocsManifestPhase {
  id: string
  title: string
  version: string
  status: DocsDocumentStatus
}

export interface DocsManifestDocument {
  id: string
  title: string
  type: DocsDocumentType
  path: string
  version?: string
  phase?: string
  status: DocsDocumentStatus
}

export interface DocsManifest {
  schemaVersion: number
  root: string
  versions: DocsManifestVersion[]
  phases: DocsManifestPhase[]
  documents: DocsManifestDocument[]
}

export interface DocsCommandOptions {
  root?: string
  force?: boolean
  title?: string
  name?: string
  version?: string
  docVersion?: string
  phase?: string
  bug?: string
  status?: DocsDocumentStatus
  type?: DocsDocumentType
  output?: string
}

export interface DocsFrontmatter {
  id: string
  title: string
  type: DocsDocumentType
  status: DocsDocumentStatus
  version?: string
  phase?: string
  related?: string[]
  createdAt: string
  updatedAt: string
}

export interface DocsCheckResult {
  errors: string[]
  warnings: string[]
}
