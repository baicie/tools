import fg from 'fast-glob'
import fs from 'fs-extra'
import { dirname, join } from 'node:path'

import { parseFrontmatter } from './frontmatter'
import { toManifestPath } from './path'
import type {
  DocsCheckResult,
  DocsManifest,
  DocsManifestDocument,
  DocsManifestPhase,
  DocsManifestVersion,
} from './types'

const MANIFEST_FILE = 'manifest.json'

export function createEmptyManifest(root: string): DocsManifest {
  return {
    schemaVersion: 1,
    root,
    versions: [],
    phases: [],
    documents: [],
  }
}

export function getManifestPath(rootPath: string): string {
  return join(rootPath, MANIFEST_FILE)
}

export function readManifest(rootPath: string): DocsManifest {
  const manifestPath = getManifestPath(rootPath)
  if (!fs.pathExistsSync(manifestPath)) {
    return createEmptyManifest(rootPath)
  }

  return fs.readJsonSync(manifestPath) as DocsManifest
}

export function writeManifest(rootPath: string, manifest: DocsManifest): void {
  fs.ensureDirSync(dirname(getManifestPath(rootPath)))
  fs.writeJsonSync(getManifestPath(rootPath), manifest, { spaces: 2 })
}

export function reindexManifest(rootPath: string): DocsManifest {
  const files = fg.sync('**/*.md', {
    cwd: rootPath,
    absolute: true,
    ignore: ['node_modules/**'],
  })

  const documents: DocsManifestDocument[] = []
  const versions: DocsManifestVersion[] = []
  const phases: DocsManifestPhase[] = []

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8')
    const frontmatter = parseFrontmatter(content)

    if (!frontmatter.id || !frontmatter.title || !frontmatter.type) return

    const status = frontmatter.status || 'draft'
    const document: DocsManifestDocument = {
      id: frontmatter.id,
      title: frontmatter.title,
      type: frontmatter.type,
      path: toManifestPath(rootPath, file),
      status,
    }

    if (frontmatter.version) document.version = frontmatter.version
    if (frontmatter.phase) document.phase = frontmatter.phase

    documents.push(document)

    if (frontmatter.type === 'version') {
      versions.push({
        id: frontmatter.id,
        title: frontmatter.title,
        status,
      })
    }

    if (
      frontmatter.phase &&
      !phases.some(phase => phase.id === frontmatter.phase)
    ) {
      phases.push({
        id: frontmatter.phase,
        title: frontmatter.phase,
        version: frontmatter.version || '',
        status,
      })
    }
  })

  const manifest: DocsManifest = {
    schemaVersion: 1,
    root: rootPath,
    versions,
    phases,
    documents,
  }

  writeManifest(rootPath, manifest)
  return manifest
}

export function addDocumentToManifest(
  rootPath: string,
  document: DocsManifestDocument,
): DocsManifest {
  const manifest = readManifest(rootPath)
  const documents = manifest.documents.filter(item => item.id !== document.id)

  documents.push(document)
  manifest.documents = documents

  if (document.type === 'version') {
    manifest.versions = manifest.versions.filter(
      item => item.id !== document.id,
    )
    manifest.versions.push({
      id: document.id,
      title: document.title,
      status: document.status,
    })
  }

  if (
    document.phase &&
    !manifest.phases.some(item => item.id === document.phase)
  ) {
    manifest.phases.push({
      id: document.phase,
      title: document.phase,
      version: document.version || '',
      status: document.status,
    })
  }

  writeManifest(rootPath, manifest)
  return manifest
}

export function checkManifest(rootPath: string): DocsCheckResult {
  const result: DocsCheckResult = {
    errors: [],
    warnings: [],
  }

  if (!fs.pathExistsSync(rootPath)) {
    result.errors.push(`docs root not found: ${rootPath}`)
    return result
  }

  const manifestPath = getManifestPath(rootPath)
  if (!fs.pathExistsSync(manifestPath)) {
    result.errors.push(`manifest not found: ${manifestPath}`)
    return result
  }

  const manifest = readManifest(rootPath)
  const ids: Record<string, boolean> = {}

  manifest.documents.forEach(document => {
    if (ids[document.id]) {
      result.errors.push(`duplicate document id: ${document.id}`)
    }

    ids[document.id] = true

    const filePath = join(rootPath, document.path)
    if (!fs.pathExistsSync(filePath)) {
      result.errors.push(`document file not found: ${document.path}`)
    }

    if (document.version) {
      const hasVersion = manifest.versions.some(
        version => version.id === document.version,
      )
      if (!hasVersion)
        result.warnings.push(`unknown version: ${document.version}`)
    }

    if (document.phase) {
      const hasPhase = manifest.phases.some(
        phase => phase.id === document.phase,
      )
      if (!hasPhase) result.warnings.push(`unknown phase: ${document.phase}`)
    }
  })

  return result
}
