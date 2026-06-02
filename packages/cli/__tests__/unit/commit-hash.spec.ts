import path from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import fs from 'fs-extra'
import request from 'request'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  diffCommit,
  getGithubCommitApiUrl,
} from '../../src/download/commit-hash'
import { CACHE_TEMPLATES } from '../../src/util'

vi.mock('request', () => ({
  default: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))

const requestMock = request as unknown as ReturnType<typeof vi.fn>
const execFileMock = execFile as unknown as ReturnType<typeof vi.fn>
const repo =
  'https://github.com/baicie/template-repo/archive/refs/heads/main.zip'

async function writeCacheMetadata(
  tempPath: string,
  commit: string | null,
): Promise<void> {
  await fs.writeFile(path.join(tempPath, '.cache-source'), repo)
  await fs.writeFile(path.join(tempPath, CACHE_TEMPLATES), '[]')
  if (commit !== null) {
    await fs.writeFile(path.join(tempPath, '.commit-hash'), commit)
  }
}

describe('commit hash cache', () => {
  const tempPath = path.join(tmpdir(), 'baicie-cli-commit-hash-test')

  beforeEach(async () => {
    requestMock.mockReset()
    execFileMock.mockReset()
    await fs.ensureDir(tempPath)
  })

  afterEach(async () => {
    await fs.remove(tempPath)
  })

  it('resolves the commit API from a GitHub archive URL', () => {
    expect(getGithubCommitApiUrl(repo)).toBe(
      'https://api.github.com/repos/baicie/template-repo/commits/main',
    )
  })

  it('keeps the cache when the local commit matches the remote commit', async () => {
    await writeCacheMetadata(tempPath, 'remote-commit')
    requestMock.mockImplementation((_options, callback) => {
      callback(null, { statusCode: 200 }, { sha: 'remote-commit' })
    })

    const result = await diffCommit(repo, tempPath)

    expect(result).toEqual({
      needsUpdate: false,
      remoteCommit: 'remote-commit',
    })
  })

  it('keeps the cache when the remote commit cannot be verified', async () => {
    await writeCacheMetadata(tempPath, 'local-commit')
    requestMock.mockImplementation((_options, callback) => {
      callback(null, { statusCode: 403 }, {})
    })
    execFileMock.mockImplementation((_command, _args, _options, callback) => {
      callback(new Error('git failed'), '')
    })

    const result = await diffCommit(repo, tempPath)

    expect(result).toEqual({
      needsUpdate: false,
      remoteCommit: null,
    })
  })

  it('updates when neither remote commit nor local cache is available', async () => {
    requestMock.mockImplementation((_options, callback) => {
      callback(null, { statusCode: 403 }, {})
    })
    execFileMock.mockImplementation((_command, _args, _options, callback) => {
      callback(new Error('git failed'), '')
    })

    const result = await diffCommit(repo, tempPath)

    expect(result).toEqual({
      needsUpdate: true,
      remoteCommit: null,
    })
  })

  it('updates when the commit exists but the template cache is missing', async () => {
    await fs.writeFile(path.join(tempPath, '.cache-source'), repo)
    await fs.writeFile(path.join(tempPath, '.commit-hash'), 'remote-commit')
    requestMock.mockImplementation((_options, callback) => {
      callback(null, { statusCode: 200 }, { sha: 'remote-commit' })
    })

    const result = await diffCommit(repo, tempPath)

    expect(result).toEqual({
      needsUpdate: true,
      remoteCommit: 'remote-commit',
    })
  })

  it('updates when the template cache exists but the commit is missing', async () => {
    await fs.writeFile(path.join(tempPath, '.cache-source'), repo)
    await fs.writeFile(path.join(tempPath, CACHE_TEMPLATES), '[]')
    requestMock.mockImplementation((_options, callback) => {
      callback(null, { statusCode: 403 }, {})
    })
    execFileMock.mockImplementation((_command, _args, _options, callback) => {
      callback(new Error('git failed'), '')
    })

    const result = await diffCommit(repo, tempPath)

    expect(result).toEqual({
      needsUpdate: true,
      remoteCommit: null,
    })
  })

  it('falls back to git ls-remote when the GitHub API fails', async () => {
    await writeCacheMetadata(tempPath, 'local-commit')
    requestMock.mockImplementation((_options, callback) => {
      callback(null, { statusCode: 403 }, {})
    })
    execFileMock.mockImplementation((_command, _args, _options, callback) => {
      callback(null, 'remote-commit\trefs/heads/main\n')
    })

    const result = await diffCommit(repo, tempPath)

    expect(result).toEqual({
      needsUpdate: true,
      remoteCommit: 'remote-commit',
    })
  })
})
