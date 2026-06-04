import type { CAC } from 'cac'
import fs from 'fs-extra'
import { dirname, join } from 'node:path'

import { getToday, stripFrontmatter } from './frontmatter'
import {
  addDocumentToManifest,
  checkManifest,
  createEmptyManifest,
  readManifest,
  reindexManifest,
  writeManifest,
} from './manifest'
import {
  DEFAULT_DOCS_ROOT,
  getDocumentId,
  getDocumentPath,
  getDocumentTitle,
  resolveDocsRoot,
  toManifestPath,
} from './path'
import { createDocumentContent, stringifyFrontmatter } from './templates'
import type {
  DocsCommandOptions,
  DocsDocumentType,
  DocsFrontmatter,
  DocsManifestDocument,
} from './types'
import type { Logger } from '../util/logger'

const DOCUMENT_TYPES: DocsDocumentType[] = [
  'goal',
  'roadmap',
  'version',
  'phase-overview',
  'design',
  'detailed-design',
  'acceptance',
  'bug',
  'review',
  'decision',
  'retro',
  'ai-draft',
  'ai-context',
]

export function registerDocsCommands(cli: CAC, logger: Logger): void {
  cli
    .command('docs [...args]', 'Manage project docs')
    .option('--root <root>', 'Docs root directory', {
      default: DEFAULT_DOCS_ROOT,
    })
    .option('--force', 'Overwrite existing generated files', { default: false })
    .option('--title <title>', 'Document title')
    .option('--name <name>', 'Document id or name')
    .option('--doc-version <doc-version>', 'Related docs version')
    .option('--phase <phase>', 'Related phase')
    .option('--bug <bug>', 'Related bug')
    .option('--status <status>', 'Document status', { default: 'draft' })
    .option('--type <type>', 'Filter by document type')
    .option('--output <output>', 'Output path')
    .action((args: string[], options: DocsCommandOptions) => {
      dispatchDocsCommand(process.cwd(), args, options, logger)
    })
}

export function dispatchDocsCommand(
  cwd: string,
  args: string[],
  options: DocsCommandOptions,
  logger: Logger,
): void {
  const command = args[0]
  const docsOptions = normalizeDocsOptions(options)

  if (!command || command === 'help') {
    printDocsHelp(logger)
    return
  }

  if (command === 'init') {
    initDocs(cwd, docsOptions, logger)
    return
  }

  if (command === 'new') {
    const type = args[1]
    if (!type) {
      logger.error('missing docs type')
      printDocsHelp(logger)
      process.exitCode = 1
      return
    }

    createDocsDocument(cwd, type, docsOptions, logger)
    return
  }

  if (command === 'list') {
    listDocs(cwd, docsOptions, logger)
    return
  }

  if (command === 'show') {
    const id = args[1]
    if (!id) {
      logger.error('missing document id')
      process.exitCode = 1
      return
    }

    showDocs(cwd, id, docsOptions, logger)
    return
  }

  if (command === 'check') {
    checkDocs(cwd, docsOptions, logger)
    return
  }

  if (command === 'reindex') {
    reindexDocs(cwd, docsOptions, logger)
    return
  }

  if (command === 'context') {
    createDocsContext(cwd, docsOptions, logger)
    return
  }

  if (command === 'inbox') {
    listDocsInbox(cwd, docsOptions, logger)
    return
  }

  if (command === 'promote') {
    const draftId = args[1]
    if (!draftId) {
      logger.error('missing draft id')
      process.exitCode = 1
      return
    }

    promoteDocsDraft(cwd, draftId, docsOptions, logger)
    return
  }

  logger.error(`unknown docs command: ${command}`)
  printDocsHelp(logger)
  process.exitCode = 1
}

export function initDocs(
  cwd: string,
  options: DocsCommandOptions,
  logger: Logger,
): void {
  const rootPath = resolveDocsRoot(cwd, options.root)
  const directories = [
    '',
    'goals',
    'roadmap',
    'versions',
    'phases',
    'records/bugs',
    'records/reviews',
    'records/decisions',
    'records/retrospectives',
    'ai/inbox',
    'ai/drafts',
    'ai/context',
  ]

  directories.forEach(directory => {
    fs.ensureDirSync(join(rootPath, directory))
  })

  writeIfNeeded(
    join(rootPath, 'index.md'),
    `# Project Docs

## Goals

## Roadmap

## Versions

## Phases

## Records
`,
    Boolean(options.force),
  )

  const manifestPath = join(rootPath, 'manifest.json')
  if (!fs.pathExistsSync(manifestPath) || options.force) {
    writeManifest(
      rootPath,
      createEmptyManifest(options.root || DEFAULT_DOCS_ROOT),
    )
  }

  logger.success(`docs initialized at ${rootPath}`)
}

export function createDocsDocument(
  cwd: string,
  rawType: string,
  options: DocsCommandOptions,
  logger: Logger,
): void {
  const type = normalizeDocumentType(rawType)
  if (!type) {
    logger.error(`unknown docs type: ${rawType}`)
    logger.info(`available types: ${DOCUMENT_TYPES.join(', ')}`)
    process.exitCode = 1
    return
  }

  const rootPath = resolveDocsRoot(cwd, options.root)
  const id = getDocumentId(type, options)
  const title = getDocumentTitle(type, options)
  const today = getToday()
  const status = options.status || 'draft'
  const frontmatter: DocsFrontmatter = {
    id,
    title,
    type,
    status,
    createdAt: today,
    updatedAt: today,
  }

  if (options.version) frontmatter.version = options.version
  if (options.phase) frontmatter.phase = options.phase
  if (type === 'phase-overview' && !frontmatter.phase) frontmatter.phase = id
  if (type === 'version' && !frontmatter.version) frontmatter.version = id

  const filePath = getDocumentPath(rootPath, type, options)
  if (fs.pathExistsSync(filePath) && !options.force) {
    logger.error(`document already exists: ${filePath}`)
    process.exitCode = 1
    return
  }

  fs.ensureDirSync(dirname(filePath))
  fs.writeFileSync(filePath, createDocumentContent(frontmatter), 'utf8')

  const document: DocsManifestDocument = {
    id,
    title,
    type,
    path: toManifestPath(rootPath, filePath),
    status,
  }

  if (frontmatter.version) document.version = frontmatter.version
  if (frontmatter.phase) document.phase = frontmatter.phase

  addDocumentToManifest(rootPath, document)
  logger.success(`document created: ${filePath}`)
}

export function listDocs(
  cwd: string,
  options: DocsCommandOptions,
  logger: Logger,
): void {
  const rootPath = resolveDocsRoot(cwd, options.root)
  const manifest = readManifest(rootPath)
  const documents = manifest.documents.filter(document => {
    if (options.type && document.type !== normalizeDocumentType(options.type))
      return false
    if (options.version && document.version !== options.version) return false
    if (options.phase && document.phase !== options.phase) return false
    return true
  })

  if (documents.length === 0) {
    logger.info('no docs found')
    return
  }

  documents.forEach(document => {
    logger.log(`${document.id} [${document.type}] ${document.path}`)
  })
}

export function showDocs(
  cwd: string,
  id: string,
  options: DocsCommandOptions,
  logger: Logger,
): void {
  const rootPath = resolveDocsRoot(cwd, options.root)
  const document = findDocument(rootPath, id)

  if (!document) {
    logger.error(`document not found: ${id}`)
    process.exitCode = 1
    return
  }

  logger.log(
    `${document.id} [${document.type}] ${join(rootPath, document.path)}`,
  )
}

export function checkDocs(
  cwd: string,
  options: DocsCommandOptions,
  logger: Logger,
): void {
  const rootPath = resolveDocsRoot(cwd, options.root)
  const result = checkManifest(rootPath)

  result.errors.forEach(error => logger.error(error))
  result.warnings.forEach(warning => logger.warn(warning))

  if (result.errors.length > 0) {
    process.exitCode = 1
    return
  }

  logger.success('docs check passed')
}

export function reindexDocs(
  cwd: string,
  options: DocsCommandOptions,
  logger: Logger,
): void {
  const rootPath = resolveDocsRoot(cwd, options.root)
  const manifest = reindexManifest(rootPath)
  logger.success(`reindexed ${manifest.documents.length} docs`)
}

export function createDocsContext(
  cwd: string,
  options: DocsCommandOptions,
  logger: Logger,
): void {
  const rootPath = resolveDocsRoot(cwd, options.root)
  const manifest = readManifest(rootPath)
  const target = getContextTarget(options)

  if (!target) {
    logger.error('missing context target: use --doc-version, --phase or --bug')
    process.exitCode = 1
    return
  }

  const documents = manifest.documents.filter(document => {
    if (document.type === 'goal') return true
    if (options.version && document.version === options.version) return true
    if (options.phase && document.phase === options.phase) return true
    if (options.bug && document.id === options.bug) return true
    if (options.bug && document.type === 'bug' && document.id === options.bug)
      return true
    return false
  })

  if (documents.length === 0) {
    logger.warn('no related docs found for context')
  }

  const content = [
    stringifyFrontmatter({
      id: `context-${target}`,
      title: `AI Context: ${target}`,
      type: 'ai-context',
      status: 'draft',
      version: options.version,
      phase: options.phase,
      createdAt: getToday(),
      updatedAt: getToday(),
    }).trimEnd(),
    '',
    `# AI Context: ${target}`,
    '',
    `Generated At: ${getToday()}`,
    '',
    '## Included Documents',
    '',
    ...documents.map(
      document => `- ${document.id} [${document.type}] ${document.path}`,
    ),
    '',
    ...documents.map(document => createContextSection(rootPath, document)),
  ].join('\n')

  const outputPath =
    options.output || join(rootPath, 'ai', 'context', `${target}.md`)
  fs.ensureDirSync(dirname(outputPath))
  fs.writeFileSync(outputPath, content, 'utf8')

  const document: DocsManifestDocument = {
    id: `context-${target}`,
    title: `AI Context: ${target}`,
    type: 'ai-context',
    path: toManifestPath(rootPath, outputPath),
    status: 'draft',
  }

  if (options.version) document.version = options.version
  if (options.phase) document.phase = options.phase

  addDocumentToManifest(rootPath, document)
  logger.success(`context created: ${outputPath}`)
}

export function listDocsInbox(
  cwd: string,
  options: DocsCommandOptions,
  logger: Logger,
): void {
  const rootPath = resolveDocsRoot(cwd, options.root)
  const files = [
    ...findMarkdownFiles(join(rootPath, 'ai', 'inbox')),
    ...findMarkdownFiles(join(rootPath, 'ai', 'drafts')),
  ]

  if (files.length === 0) {
    logger.info('no inbox docs found')
    return
  }

  files.forEach(file => {
    logger.log(toManifestPath(rootPath, file))
  })
}

export function promoteDocsDraft(
  cwd: string,
  draftId: string,
  options: DocsCommandOptions,
  logger: Logger,
): void {
  const type = options.type ? normalizeDocumentType(options.type) : undefined
  if (!type) {
    logger.error('missing or unknown target type: use --type <type>')
    process.exitCode = 1
    return
  }

  if (type === 'ai-draft' || type === 'ai-context') {
    logger.error(`cannot promote draft to ${type}`)
    process.exitCode = 1
    return
  }

  const rootPath = resolveDocsRoot(cwd, options.root)
  const sourcePath = findDraftPath(rootPath, draftId)
  if (!sourcePath) {
    logger.error(`draft not found: ${draftId}`)
    process.exitCode = 1
    return
  }

  const rawContent = fs.readFileSync(sourcePath, 'utf8')
  const body = stripFrontmatter(rawContent)
  const title =
    options.title ||
    getDocumentTitle(type, {
      name: draftId,
    })
  const id = getDocumentId(type, {
    name: options.name || draftId,
    title,
  })
  const today = getToday()
  const frontmatter: DocsFrontmatter = {
    id,
    title,
    type,
    status: options.status || 'draft',
    createdAt: today,
    updatedAt: today,
  }

  if (options.version) frontmatter.version = options.version
  if (options.phase) frontmatter.phase = options.phase

  const targetPath = getDocumentPath(rootPath, type, {
    ...options,
    name: id,
    title,
  })

  if (fs.pathExistsSync(targetPath) && !options.force) {
    logger.error(`document already exists: ${targetPath}`)
    process.exitCode = 1
    return
  }

  fs.ensureDirSync(dirname(targetPath))
  fs.writeFileSync(
    targetPath,
    `${createDocumentContent(frontmatter)}\n${body}`,
    'utf8',
  )
  fs.removeSync(sourcePath)

  addDocumentToManifest(rootPath, {
    id,
    title,
    type,
    path: toManifestPath(rootPath, targetPath),
    version: frontmatter.version,
    phase: frontmatter.phase,
    status: frontmatter.status,
  })

  logger.success(`draft promoted: ${targetPath}`)
}

function normalizeDocumentType(type: string): DocsDocumentType | undefined {
  if (type === 'phase') return 'phase-overview'
  return DOCUMENT_TYPES.find(item => item === type)
}

function normalizeDocsOptions(options: DocsCommandOptions): DocsCommandOptions {
  if (options.version || !options.docVersion) return options

  const normalized: DocsCommandOptions = {
    root: options.root,
    force: options.force,
    title: options.title,
    name: options.name,
    version: options.docVersion,
    docVersion: options.docVersion,
    phase: options.phase,
    bug: options.bug,
    status: options.status,
    type: options.type,
    output: options.output,
  }

  return normalized
}

function writeIfNeeded(
  filePath: string,
  content: string,
  force: boolean,
): void {
  if (fs.pathExistsSync(filePath) && !force) return

  fs.ensureDirSync(dirname(filePath))
  fs.writeFileSync(filePath, content, 'utf8')
}

function findDocument(
  rootPath: string,
  id: string,
): DocsManifestDocument | undefined {
  const manifest = readManifest(rootPath)
  return manifest.documents.find(document => document.id === id)
}

function getContextTarget(options: DocsCommandOptions): string {
  if (options.bug) return options.bug
  if (options.phase) return options.phase
  if (options.version) return options.version
  return ''
}

function createContextSection(
  rootPath: string,
  document: DocsManifestDocument,
): string {
  const filePath = join(rootPath, document.path)
  if (!fs.pathExistsSync(filePath)) {
    return `## ${document.id}\n\nMissing file: ${document.path}\n`
  }

  const content = stripFrontmatter(fs.readFileSync(filePath, 'utf8')).trim()

  return `## ${document.title}

Source: ${document.path}
Type: ${document.type}

${content}
`
}

function findMarkdownFiles(directory: string): string[] {
  if (!fs.pathExistsSync(directory)) return []

  return fs
    .readdirSync(directory)
    .filter(file => file.endsWith('.md'))
    .map(file => join(directory, file))
}

function findDraftPath(rootPath: string, draftId: string): string {
  const normalized = draftId.endsWith('.md') ? draftId : `${draftId}.md`
  const candidates = [
    join(rootPath, 'ai', 'inbox', normalized),
    join(rootPath, 'ai', 'drafts', normalized),
    join(rootPath, draftId),
  ]

  const found = candidates.find(candidate => fs.pathExistsSync(candidate))
  return found || ''
}

function printDocsHelp(logger: Logger): void {
  logger.log(`Usage:
  bca docs init [--root docs/project]
  bca docs new <type> [--title <title>] [--name <name>] [--doc-version <version>]
  bca docs list [--type <type>] [--doc-version <version>] [--phase <phase>]
  bca docs show <id>
  bca docs check
  bca docs reindex
  bca docs context [--doc-version <version>] [--phase <phase>] [--bug <bug>]
  bca docs inbox
  bca docs promote <draft-id> --type <type>

Types:
  ${DOCUMENT_TYPES.join(', ')}
`)
}
