import path from 'node:path'
import { tmpdir } from 'node:os'
import fs from 'fs-extra'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CACHE_TEMPLATES } from '../../src/util'
import { download } from '../../src/download/download'
import { diffCommit } from '../../src/download/commit-hash'
import { fetchTemplate } from '../../src/download/fetch-git-repo'

vi.mock('../../src/download/download', () => ({
  download: vi.fn(),
  readDirWithFileTypes: vi.fn(),
}))

vi.mock('../../src/download/commit-hash', () => ({
  diffCommit: vi.fn(),
  updateLocalCommit: vi.fn(),
}))

const downloadMock = download as unknown as ReturnType<typeof vi.fn>
const diffCommitMock = diffCommit as unknown as ReturnType<typeof vi.fn>

describe('fetchTemplate cache', () => {
  const savePath = path.join(tmpdir(), 'baicie-cli-fetch-template-test')
  const cachePath = path.join(savePath, 'baicie-temp-meta')
  const repo =
    'https://github.com/baicie/template-repo/archive/refs/heads/main.zip'
  const logger = {
    debug: vi.fn(),
  }

  beforeEach(async () => {
    downloadMock.mockReset()
    diffCommitMock.mockReset()
    logger.debug.mockReset()
    await fs.ensureDir(cachePath)
  })

  afterEach(async () => {
    await fs.remove(savePath)
  })

  it('returns cached templates without downloading when commit cache is fresh', async () => {
    const templates = [{ name: 'default', desc: 'default template' }]
    await fs.writeFile(
      path.join(cachePath, CACHE_TEMPLATES),
      JSON.stringify(templates),
    )
    diffCommitMock.mockResolvedValue({
      needsUpdate: false,
      remoteCommit: 'remote-commit',
    })

    const result = await fetchTemplate(repo, savePath, {
      logger,
    } as never)

    expect(result).toEqual(templates)
    expect(downloadMock).not.toHaveBeenCalled()
  })
})
