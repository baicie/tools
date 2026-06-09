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
