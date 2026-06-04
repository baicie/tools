import { join, relative } from 'node:path'

import type { DocsCommandOptions, DocsDocumentType } from './types'

export const DEFAULT_DOCS_ROOT = 'docs/project'

export function resolveDocsRoot(cwd: string, root?: string): string {
  return join(cwd, root || DEFAULT_DOCS_ROOT)
}

export function toManifestPath(rootPath: string, filePath: string): string {
  return relative(rootPath, filePath).replace(/\\/g, '/')
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getDocumentId(
  type: DocsDocumentType,
  options: DocsCommandOptions,
): string {
  if (options.name) return slugify(options.name)
  if (options.title) return slugify(options.title)
  return type
}

export function getDocumentTitle(
  type: DocsDocumentType,
  options: DocsCommandOptions,
): string {
  if (options.title) return options.title
  if (options.name) return options.name
  return getDefaultTitle(type)
}

export function getDefaultTitle(type: DocsDocumentType): string {
  const titleMap: Record<DocsDocumentType, string> = {
    goal: 'Final Goal',
    roadmap: 'Roadmap',
    version: 'Version',
    'phase-overview': 'Phase Overview',
    design: 'Design',
    'detailed-design': 'Detailed Design',
    acceptance: 'Acceptance',
    bug: 'Bug Record',
    review: 'Review Record',
    decision: 'Decision Record',
    retro: 'Retrospective',
    'ai-draft': 'AI Draft',
    'ai-context': 'AI Context',
  }

  return titleMap[type]
}

export function getDocumentPath(
  rootPath: string,
  type: DocsDocumentType,
  options: DocsCommandOptions,
): string {
  const id = getDocumentId(type, options)

  if (type === 'goal') return join(rootPath, 'goals', `${id}.md`)
  if (type === 'roadmap') return join(rootPath, 'roadmap', `${id}.md`)
  if (type === 'version') return join(rootPath, 'versions', id, 'index.md')

  if (
    type === 'phase-overview' ||
    type === 'design' ||
    type === 'detailed-design' ||
    type === 'acceptance'
  ) {
    const phase = options.phase || options.name || id
    return join(rootPath, 'phases', slugify(phase), `${type}.md`)
  }

  if (type === 'bug') return join(rootPath, 'records', 'bugs', `${id}.md`)
  if (type === 'review') return join(rootPath, 'records', 'reviews', `${id}.md`)
  if (type === 'decision')
    return join(rootPath, 'records', 'decisions', `${id}.md`)
  if (type === 'retro')
    return join(rootPath, 'records', 'retrospectives', `${id}.md`)
  if (type === 'ai-draft') return join(rootPath, 'ai', 'drafts', `${id}.md`)

  return join(rootPath, 'ai', 'context', `${id}.md`)
}
