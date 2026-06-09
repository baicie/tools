import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { ParsedChangeset, ReleaseConfig } from '../../src/workspace/types'
import { generateUnifiedChangelog } from '../../src/workspace/changelog'

function createTempDir(): string {
  const dir = join(tmpdir(), 'release-test-changelog-' + Date.now())
  mkdirSync(dir, { recursive: true })
  return dir
}

function makeConfig(overrides?: Partial<ReleaseConfig>): ReleaseConfig {
  return {
    repo: 'baicie/example',
    repositoryUrl: 'https://github.com/baicie/example.git',
    mode: 'changesets-fixed',
    cwd: createTempDir(),
    workspace: {
      roots: ['packages'],
    },
    changesets: {
      configFile: '.changeset/config.json',
      releaseFile: '.changeset/release.md',
    },
    ...overrides,
  }
}

describe('generateUnifiedChangelog', () => {
  let config: ReleaseConfig
  let dir: string

  beforeEach(() => {
    dir = createTempDir()
    config = makeConfig({ cwd: dir })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('creates CHANGELOG.md when it does not exist', async () => {
    const changesets: ParsedChangeset[] = [
      {
        id: 'abc123',
        file: '',
        summary: 'Fix login button alignment',
        releases: [{ name: '@zeus-js/core', type: 'patch' }],
      },
    ]

    await generateUnifiedChangelog(config, '1.0.0', changesets)

    const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    expect(content).toContain('# Changelog')
    expect(content).toContain('## 1.0.0')
    expect(content).toContain('Fix login button alignment')
  })

  it('prepends new entries to existing CHANGELOG.md', async () => {
    writeFileSync(
      join(dir, 'CHANGELOG.md'),
      '# Changelog\n\n## 0.9.0 (2026-01-15)\n\n- Initial release\n',
    )

    const changesets: ParsedChangeset[] = [
      {
        id: 'def456',
        file: '',
        summary: 'Add new API endpoint',
        releases: [{ name: '@zeus-js/core', type: 'minor' }],
      },
    ]

    await generateUnifiedChangelog(config, '1.0.0', changesets)

    const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    const firstEntry = content.indexOf('## 1.0.0')
    const secondEntry = content.indexOf('## 0.9.0')
    expect(firstEntry).toBeGreaterThan(0)
    expect(secondEntry).toBeGreaterThan(firstEntry)
  })

  it('groups changes by semver type', async () => {
    const changesets: ParsedChangeset[] = [
      {
        id: 'major1',
        file: '',
        summary: 'Drop Node 16 support',
        releases: [{ name: '@zeus-js/core', type: 'major' }],
      },
      {
        id: 'minor1',
        file: '',
        summary: 'Add new component',
        releases: [{ name: '@zeus-js/ui', type: 'minor' }],
      },
      {
        id: 'patch1',
        file: '',
        summary: 'Fix runtime error',
        releases: [{ name: '@zeus-js/core', type: 'patch' }],
      },
    ]

    await generateUnifiedChangelog(config, '2.0.0', changesets)

    const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    const breakingIndex = content.indexOf('Breaking Changes')
    const featuresIndex = content.indexOf('Features')
    const fixesIndex = content.indexOf('Fixes')

    expect(breakingIndex).toBeGreaterThan(0)
    expect(featuresIndex).toBeGreaterThan(0)
    expect(fixesIndex).toBeGreaterThan(0)

    expect(breakingIndex).toBeLessThan(featuresIndex)
    expect(featuresIndex).toBeLessThan(fixesIndex)
  })

  it('handles empty changesets list gracefully', async () => {
    await generateUnifiedChangelog(config, '1.0.0', [])

    const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    expect(content).toContain('## 1.0.0')
    expect(content).toContain('Release v1.0.0')
  })

  it('includes correct date in entry', async () => {
    await generateUnifiedChangelog(config, '1.0.0', [])

    const today = new Date().toISOString().slice(0, 10)
    const content = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    expect(content).toContain(`(${today})`)
  })

  it('returns early when changelogFile is false', async () => {
    const configNoChangelog = makeConfig({ cwd: dir, changelogFile: false })

    await generateUnifiedChangelog(configNoChangelog, '1.0.0', [])

    expect(() => readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')).toThrow()
  })

  it('writes to custom changelogFile path', async () => {
    const configCustom = makeConfig({
      cwd: dir,
      changelogFile: 'HISTORY.md',
    })

    await generateUnifiedChangelog(configCustom, '1.0.0', [])

    const content = readFileSync(join(dir, 'HISTORY.md'), 'utf-8')
    expect(content).toContain('## 1.0.0')
  })
})
