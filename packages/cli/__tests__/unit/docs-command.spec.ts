import { afterEach, describe, expect, it } from 'vitest'
import fs from 'fs-extra'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  checkDocs,
  createDocsContext,
  createDocsDocument,
  initDocs,
  listDocsInbox,
  promoteDocsDraft,
  reindexDocs,
  showDocs,
} from '../../src/docs/commands'
import { readManifest } from '../../src/docs/manifest'
import { createLogger } from '../../src/util/logger'

const logger = createLogger({ debug: false, prefix: '[test-docs]' })

describe('docs command helpers', () => {
  const testDir = join(tmpdir(), 'baicie-cli-docs-command-test')

  afterEach(() => {
    fs.removeSync(testDir)
    process.exitCode = undefined
  })

  it('initializes docs root and manifest', () => {
    initDocs(testDir, {}, logger)

    expect(fs.pathExistsSync(join(testDir, 'docs/project/index.md'))).toBe(true)
    expect(fs.pathExistsSync(join(testDir, 'docs/project/manifest.json'))).toBe(
      true,
    )

    const manifest = readManifest(join(testDir, 'docs/project'))
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.documents).toEqual([])
  })

  it('creates a phase document and updates manifest', () => {
    initDocs(testDir, {}, logger)
    createDocsDocument(
      testDir,
      'phase',
      {
        name: 'phase-01-auth',
        title: 'Auth Phase',
        version: 'v1',
      },
      logger,
    )

    const filePath = join(
      testDir,
      'docs/project/phases/phase-01-auth/phase-overview.md',
    )
    expect(fs.pathExistsSync(filePath)).toBe(true)

    const manifest = readManifest(join(testDir, 'docs/project'))
    expect(manifest.documents).toHaveLength(1)
    expect(manifest.documents[0].id).toBe('phase-01-auth')
    expect(manifest.documents[0].type).toBe('phase-overview')
    expect(manifest.documents[0].version).toBe('v1')
    expect(manifest.phases[0].id).toBe('phase-01-auth')
  })

  it('reindexes markdown frontmatter into manifest', () => {
    initDocs(testDir, {}, logger)
    createDocsDocument(
      testDir,
      'bug',
      {
        name: 'bug-auth-token-expire',
        title: 'Auth Token Expire',
        phase: 'phase-01-auth',
        version: 'v1',
      },
      logger,
    )

    reindexDocs(testDir, {}, logger)

    const manifest = readManifest(join(testDir, 'docs/project'))
    expect(manifest.documents[0].id).toBe('bug-auth-token-expire')
    expect(manifest.documents[0].type).toBe('bug')
  })

  it('marks check as failed when docs root is missing', () => {
    checkDocs(testDir, {}, logger)

    expect(process.exitCode).toBe(1)
  })

  it('creates an AI context document for a phase', () => {
    initDocs(testDir, {}, logger)
    createDocsDocument(
      testDir,
      'goal',
      {
        name: 'final-goal',
        title: 'Final Goal',
      },
      logger,
    )
    createDocsDocument(
      testDir,
      'phase',
      {
        name: 'phase-01-auth',
        title: 'Auth Phase',
        version: 'v1',
      },
      logger,
    )

    createDocsContext(testDir, { phase: 'phase-01-auth' }, logger)

    const contextPath = join(
      testDir,
      'docs/project/ai/context/phase-01-auth.md',
    )
    expect(fs.pathExistsSync(contextPath)).toBe(true)
    expect(fs.readFileSync(contextPath, 'utf8')).toContain('Auth Phase')

    const manifest = readManifest(join(testDir, 'docs/project'))
    expect(
      manifest.documents.some(document => document.type === 'ai-context'),
    ).toBe(true)
  })

  it('promotes an inbox draft into a managed document', () => {
    initDocs(testDir, {}, logger)
    const draftPath = join(testDir, 'docs/project/ai/inbox/auth-review.md')
    fs.writeFileSync(draftPath, '# Draft Review\n\nReview notes.', 'utf8')

    listDocsInbox(testDir, {}, logger)
    promoteDocsDraft(
      testDir,
      'auth-review',
      {
        type: 'review',
        phase: 'phase-01-auth',
        version: 'v1',
      },
      logger,
    )

    const targetPath = join(
      testDir,
      'docs/project/records/reviews/auth-review.md',
    )
    expect(fs.pathExistsSync(draftPath)).toBe(false)
    expect(fs.pathExistsSync(targetPath)).toBe(true)
    expect(fs.readFileSync(targetPath, 'utf8')).toContain('Review notes.')

    const manifest = readManifest(join(testDir, 'docs/project'))
    expect(manifest.documents[0].type).toBe('review')
  })

  it('shows an existing document without failing', () => {
    initDocs(testDir, {}, logger)
    createDocsDocument(
      testDir,
      'version',
      {
        name: 'v1',
        title: 'Version 1',
      },
      logger,
    )

    showDocs(testDir, 'v1', {}, logger)

    expect(process.exitCode).toBeUndefined()
  })
})
