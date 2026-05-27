import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  backupVersion,
  clearBackups,
  deleteRemoteTag,
  deleteTag,
  getActiveVersion,
  getVersionChoices,
  hasTag,
  rollbackVersion,
  updateVersion,
  versionBackups,
} from '../src/utils'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'

describe('versionBackups', () => {
  beforeEach(() => {
    clearBackups()
  })

  afterEach(() => {
    clearBackups()
  })

  it('should be empty initially after clear', () => {
    expect(versionBackups).toHaveLength(0)
  })

  it('should store backups after backupVersion', () => {
    backupVersion('/path/a', '1.0.0', '1.1.0')
    backupVersion('/path/b', '2.0.0', '2.1.0')

    expect(versionBackups).toHaveLength(2)
    expect(versionBackups[0].pkgPath).toBe('/path/a')
    expect(versionBackups[0].originalVersion).toBe('1.0.0')
    expect(versionBackups[0].updatedVersion).toBe('1.1.0')
  })

  it('should be cleared by clearBackups', () => {
    backupVersion('/path', '1.0.0', '1.1.0')
    clearBackups()

    expect(versionBackups).toHaveLength(0)
  })
})

describe('updateVersion', () => {
  const testDir = path.join(tmpdir(), 'release-test-' + Date.now())
  let pkgPath: string

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
    pkgPath = path.join(testDir, 'package.json')
  })

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch {}
  })

  it('should update version in package.json', () => {
    const pkgData = { name: 'test', version: '1.0.0', description: 'desc' }
    writeFileSync(pkgPath, JSON.stringify(pkgData))

    updateVersion(pkgPath, '2.0.0')

    const updated = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    expect(updated.version).toBe('2.0.0')
    expect(updated.name).toBe('test')
    expect(updated.description).toBe('desc')
  })

  it('should preserve other fields when updating version', () => {
    const pkgData = {
      name: 'test-pkg',
      version: '1.0.0',
      dependencies: { react: '^18.0.0' },
      scripts: { build: 'tsc' },
      private: true,
    }
    writeFileSync(pkgPath, JSON.stringify(pkgData))

    updateVersion(pkgPath, '3.0.0')

    const updated = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    expect(updated.version).toBe('3.0.0')
    expect(updated.dependencies).toEqual({ react: '^18.0.0' })
    expect(updated.scripts).toEqual({ build: 'tsc' })
    expect(updated.private).toBe(true)
  })

  it('should format JSON with newline at end', () => {
    writeFileSync(pkgPath, JSON.stringify({ name: 't', version: '1.0.0' }))

    updateVersion(pkgPath, '2.0.0')

    const content = readFileSync(pkgPath, 'utf-8')
    expect(content.endsWith('\n')).toBe(true)
  })
})

describe('rollbackVersion', () => {
  const testDir = path.join(tmpdir(), 'release-rollback-test-' + Date.now())

  beforeEach(() => {
    clearBackups()
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    clearBackups()
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch {}
  })

  it('should rollback all versions and clear backups', () => {
    const pkgPath1 = path.join(testDir, 'pkg1.json')
    const pkgPath2 = path.join(testDir, 'pkg2.json')

    writeFileSync(pkgPath1, JSON.stringify({ version: '1.0.0' }))
    writeFileSync(pkgPath2, JSON.stringify({ version: '2.0.0' }))

    backupVersion(pkgPath1, '1.0.0', '1.1.0')
    backupVersion(pkgPath2, '2.0.0', '2.1.0')

    updateVersion(pkgPath1, '1.1.0')
    updateVersion(pkgPath2, '2.1.0')

    rollbackVersion()

    const pkg1 = JSON.parse(readFileSync(pkgPath1, 'utf-8'))
    const pkg2 = JSON.parse(readFileSync(pkgPath2, 'utf-8'))
    expect(pkg1.version).toBe('1.0.0')
    expect(pkg2.version).toBe('2.0.0')
    expect(versionBackups).toHaveLength(0)
  })

  it('should handle empty backups gracefully', () => {
    clearBackups()
    rollbackVersion()
    expect(versionBackups).toHaveLength(0)
  })
})

describe('getVersionChoices', () => {
  it('for stable version should include next, minor, major, beta options', () => {
    const choices = getVersionChoices('1.0.0')

    const values = choices.map(c => c.value)
    expect(values).toContain('custom')

    const nextChoice = choices.find(c => c.title.includes('next'))
    expect(nextChoice).toBeDefined()

    const majorChoice = choices.find(c => c.title.includes('major'))
    expect(majorChoice).toBeDefined()

    const minorChoice = choices.find(c => c.title.includes('minor'))
    expect(minorChoice).toBeDefined()

    const betaMinorChoice = choices.find(c => c.title.includes('beta-minor'))
    expect(betaMinorChoice).toBeDefined()

    const betaMajorChoice = choices.find(c => c.title.includes('beta-major'))
    expect(betaMajorChoice).toBeDefined()
  })

  it('for beta version should include stable option', () => {
    const choices = getVersionChoices('1.0.0-beta.1')

    const stableChoice = choices.find(c => c.title.includes('stable'))
    expect(stableChoice).toBeDefined()
  })

  it('for alpha version should include beta option', () => {
    const choices = getVersionChoices('1.0.0-alpha.1')

    const betaChoice = choices.find(c => c.title.includes('beta'))
    expect(betaChoice).toBeDefined()
  })

  it('should include custom option', () => {
    const choices = getVersionChoices('1.0.0')

    const customChoice = choices.find(c => c.value === 'custom')
    expect(customChoice).toBeDefined()
  })

  it('each choice should have title and value', () => {
    const choices = getVersionChoices('1.0.0')

    choices.forEach(choice => {
      expect(choice).toHaveProperty('title')
      expect(choice).toHaveProperty('value')
      expect(choice.title).toBeTruthy()
      expect(choice.value).toBeTruthy()
    })
  })

  it('title should contain the version value', () => {
    const choices = getVersionChoices('1.0.0')

    choices.forEach(choice => {
      if (choice.value !== 'custom') {
        expect(choice.title).toContain(choice.value)
      }
    })
  })

  it('should generate valid semver for non-custom choices', () => {
    const choices = getVersionChoices('1.0.0')

    choices.forEach(choice => {
      if (choice.value !== 'custom') {
        expect(choice.value).toMatch(/^\d+\.\d+\.\d+/)
      }
    })
  })

  it('should increment version correctly', () => {
    const choices = getVersionChoices('1.0.0')

    const nextChoice = choices.find(c => c.title.includes('next'))
    expect(nextChoice!.value).toMatch(/^1\.0\.\d+/)
  })

  it('should handle v-prefixed versions', () => {
    const choices = getVersionChoices('v1.0.0')
    expect(choices.length).toBeGreaterThan(0)
  })

  it('for beta version should not include alpha options', () => {
    const choices = getVersionChoices('1.0.0-beta.1')

    const alphaMinorChoice = choices.find(c => c.title.includes('alpha-minor'))
    expect(alphaMinorChoice).toBeUndefined()
  })

  it('for alpha version should not include beta-minor/beta-major options', () => {
    const choices = getVersionChoices('1.0.0-alpha.1')

    const betaMinorChoice = choices.find(c => c.title.includes('beta-minor'))
    expect(betaMinorChoice).toBeUndefined()

    const betaMajorChoice = choices.find(c => c.title.includes('beta-major'))
    expect(betaMajorChoice).toBeUndefined()
  })

  it('choices should be sorted with next first', () => {
    const choices = getVersionChoices('1.0.0')

    expect(choices[0].title).toContain('next')
  })

  it('should move duplicate version values to the end', () => {
    const choices = getVersionChoices('1.0.0')

    const values = choices.map(c => c.value)
    const nonCustom = values.filter(v => v !== 'custom')
    const uniqueCount = new Set(nonCustom).size

    if (nonCustom.length > uniqueCount) {
      const firstDupIndex = values.findIndex(
        (v, i) => v !== 'custom' && values.indexOf(v) !== i,
      )
      const lastDupIndex =
        values.length -
        1 -
        [...values]
          .reverse()
          .findIndex(
            (v, i) => v !== 'custom' && values.indexOf(v) < values.length - i,
          )
      expect(firstDupIndex).toBeLessThan(lastDupIndex)
    }
  })

  it('should include current version as retry option', () => {
    const choices = getVersionChoices('1.0.0')

    const retryChoice = choices.find(c => c.value === '1.0.0')
    expect(retryChoice).toBeDefined()
    expect(retryChoice!.title).toContain('retry')
  })

  it('for alpha version should include next option', () => {
    const choices = getVersionChoices('1.0.0-alpha.1')

    const nextChoice = choices.find(c => c.title.includes('next'))
    expect(nextChoice).toBeDefined()
  })

  it('for beta version should include stable option', () => {
    const choices = getVersionChoices('1.0.0-beta.1')

    const stableChoice = choices.find(c => c.title.includes('stable'))
    expect(stableChoice).toBeDefined()
  })

  it('for beta version should include next option', () => {
    const choices = getVersionChoices('1.0.0-beta.1')

    const nextChoice = choices.find(c => c.title.includes('next'))
    expect(nextChoice).toBeDefined()
  })

  it('for beta version should not include minor/major options', () => {
    const choices = getVersionChoices('1.0.0-beta.1')

    const minorChoice = choices.find(
      c => c.title.includes('minor') && c.title.includes('beta') === false,
    )
    expect(minorChoice).toBeUndefined()

    const majorChoice = choices.find(
      c => c.title.includes('major') && c.title.includes('beta') === false,
    )
    expect(majorChoice).toBeUndefined()
  })
})

describe('hasTag', () => {
  it('should return boolean', async () => {
    const result = await hasTag('nonexistent-tag-12345-' + Date.now())
    expect(typeof result).toBe('boolean')
  })

  it('should return false for nonexistent tag', async () => {
    const result = await hasTag('nonexistent-tag-xyz-' + Date.now() + '-12345')
    expect(result).toBe(false)
  })
})

describe('deleteTag', () => {
  it('should handle nonexistent tag gracefully', async () => {
    await expect(
      deleteTag('nonexistent-tag-xyz-' + Date.now()),
    ).resolves.not.toThrow()
  })
})

describe('deleteRemoteTag', () => {
  it('should handle nonexistent remote tag gracefully', async () => {
    await expect(
      deleteRemoteTag('nonexistent-remote-tag-' + Date.now()),
    ).resolves.not.toThrow()
  })
})

describe('getActiveVersion', () => {
  it('should return string or undefined', async () => {
    const result = await getActiveVersion(
      'nonexistent-package-xyz-' + Date.now() + '-12345-abc',
    )
    expect(result === undefined || typeof result === 'string').toBe(true)
  })

  it('should return undefined for nonexistent package', async () => {
    const result = await getActiveVersion(
      'nonexistent-npm-package-xyz-' + Date.now() + '-12345-abc-def',
    )
    expect(result).toBeUndefined()
  })
})
