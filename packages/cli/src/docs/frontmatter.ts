import type {
  DocsDocumentStatus,
  DocsDocumentType,
  DocsFrontmatter,
} from './types'

export function parseFrontmatter(content: string): Partial<DocsFrontmatter> {
  if (!content.startsWith('---')) return {}

  const endIndex = content.indexOf('\n---', 3)
  if (endIndex < 0) return {}

  const raw = content.slice(3, endIndex).trim()
  const lines = raw.split(/\r?\n/)
  const result: Partial<DocsFrontmatter> = {}

  lines.forEach(line => {
    const index = line.indexOf(':')
    if (index < 0) return

    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()

    if (key === 'id') result.id = value
    if (key === 'title') result.title = value
    if (key === 'type') result.type = value as DocsDocumentType
    if (key === 'status') result.status = value as DocsDocumentStatus
    if (key === 'version') result.version = value
    if (key === 'phase') result.phase = value
    if (key === 'createdAt') result.createdAt = value
    if (key === 'updatedAt') result.updatedAt = value
  })

  return result
}

export function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) return content

  const endIndex = content.indexOf('\n---', 3)
  if (endIndex < 0) return content

  return content.slice(endIndex + 4).trimStart()
}

export function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}
