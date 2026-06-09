import { describe, expect, it } from 'vitest'
import {
  branchMatches,
  branchPatternToRegExp,
} from '../../src/workspace/canary'

describe('branchPatternToRegExp', () => {
  it('exact match', () => {
    expect(branchPatternToRegExp('main').test('main')).toBe(true)
    expect(branchPatternToRegExp('main').test('master')).toBe(false)
  })

  it('double star matches recursive paths', () => {
    expect(branchPatternToRegExp('feat/**').test('feat/a')).toBe(true)
    expect(branchPatternToRegExp('feat/**').test('feat/a/b')).toBe(true)
    expect(branchPatternToRegExp('feat/**').test('feat/a/b/c')).toBe(true)
    expect(branchPatternToRegExp('fix/**').test('fix/compiler/attrs')).toBe(
      true,
    )
  })

  it('double star does not cross path boundaries', () => {
    expect(branchPatternToRegExp('feat/**').test('featx/a')).toBe(false)
    expect(branchPatternToRegExp('feat/**').test('feats/a')).toBe(false)
  })

  it('single star matches within one path segment', () => {
    expect(branchPatternToRegExp('feat/*').test('feat/a')).toBe(true)
    expect(branchPatternToRegExp('feat/*').test('feat/compiler')).toBe(true)
    expect(branchPatternToRegExp('feat/*').test('feat/a/b')).toBe(false)
    expect(branchPatternToRegExp('feat/*').test('fix/a')).toBe(false)
  })

  it('escapes regex metacharacters', () => {
    expect(branchPatternToRegExp('fix/my.issue').test('fix/my.issue')).toBe(
      true,
    )
    expect(branchPatternToRegExp('fix/my.issue').test('fix/myXissue')).toBe(
      false,
    )
    expect(branchPatternToRegExp('feat/+').test('feat/+')).toBe(true)
    expect(branchPatternToRegExp('feat/+').test('feat/a')).toBe(false)
  })
})

describe('branchMatches', () => {
  it('matches exact branch name', () => {
    expect(branchMatches('main', ['main'])).toBe(true)
    expect(branchMatches('main', ['master', 'main'])).toBe(true)
    expect(branchMatches('develop', ['main', 'develop'])).toBe(true)
    expect(branchMatches('feature/a', ['main'])).toBe(false)
  })

  it('matches feat/** pattern', () => {
    expect(branchMatches('feat/a', ['feat/**'])).toBe(true)
    expect(branchMatches('feat/a/b', ['feat/**'])).toBe(true)
    expect(branchMatches('feat/compiler/attrs', ['feat/**'])).toBe(true)
    expect(branchMatches('fix/a', ['feat/**'])).toBe(false)
  })

  it('matches fix/** pattern', () => {
    expect(branchMatches('fix/a', ['fix/**'])).toBe(true)
    expect(branchMatches('fix/compiler/attrs', ['fix/**'])).toBe(true)
    expect(branchMatches('feat/a', ['fix/**'])).toBe(false)
  })

  it('matches multiple patterns', () => {
    const patterns = ['main', 'feat/**', 'fix/**', 'release/**', 'hotfix/**']

    expect(branchMatches('main', patterns)).toBe(true)
    expect(branchMatches('feat/a', patterns)).toBe(true)
    expect(branchMatches('fix/b', patterns)).toBe(true)
    expect(branchMatches('release/1.0', patterns)).toBe(true)
    expect(branchMatches('hotfix/patch', patterns)).toBe(true)
    expect(branchMatches('docs/a', patterns)).toBe(false)
  })

  it('stops at first match', () => {
    expect(branchMatches('main', ['main', 'feat/**'])).toBe(true)
  })
})
