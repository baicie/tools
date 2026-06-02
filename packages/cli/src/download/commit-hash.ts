import { execFile } from 'node:child_process'
import fs from 'fs-extra'
import path from 'node:path'
import request from 'request'
import { CACHE_TEMPLATES } from '../util'

const DEFAULT_BRANCH = 'main'
const CACHE_SOURCE = '.cache-source'

interface GithubRepoInfo {
  apiUrl: string
  branch: string
  gitUrl: string
}

function getGithubRepoInfo(repo: string): GithubRepoInfo | null {
  let url: URL
  try {
    url = new URL(repo)
  } catch {
    return null
  }

  if (url.hostname !== 'github.com') {
    return null
  }

  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length < 2) {
    return null
  }

  const owner = parts[0]
  const repoName = parts[1].replace(/\.git$/, '')
  let branch = DEFAULT_BRANCH

  if (
    parts.length >= 6 &&
    parts[2] === 'archive' &&
    parts[3] === 'refs' &&
    parts[4] === 'heads'
  ) {
    branch = parts
      .slice(5)
      .join('/')
      .replace(/\.zip$/, '')
  }

  return {
    apiUrl: `https://api.github.com/repos/${owner}/${repoName}/commits/${branch}`,
    branch,
    gitUrl: `https://github.com/${owner}/${repoName}.git`,
  }
}

export function getGithubCommitApiUrl(repo: string): string | null {
  const info = getGithubRepoInfo(repo)
  if (info === null) {
    return null
  }

  return info.apiUrl
}

function getRemoteCommitByGit(repo: string): Promise<string | null> {
  const info = getGithubRepoInfo(repo)
  if (info === null) {
    return Promise.resolve(null)
  }

  return new Promise<string | null>(resolve => {
    execFile(
      'git',
      ['ls-remote', info.gitUrl, `refs/heads/${info.branch}`],
      { timeout: 10000 },
      (error, stdout) => {
        if (error) {
          return resolve(null)
        }

        const commit = stdout.trim().split(/\s+/)[0]
        return resolve(commit || null)
      },
    )
  })
}

function getRemoteCommitByApi(repo: string): Promise<string | null> {
  const url = getGithubCommitApiUrl(repo)
  if (url === null) {
    return Promise.resolve(null)
  }

  return new Promise<string>((resolve, reject) => {
    request(
      { url, headers: { 'User-Agent': '@baicie/cli' }, json: true },
      (err, res, body) => {
        if (err) return reject(err)
        if (res.statusCode !== 200) {
          return resolve('')
        }
        resolve(body && body.sha ? body.sha : '')
      },
    )
  })
}

function getRemoteLatestCommit(repo: string): Promise<string | null> {
  return getRemoteCommitByApi(repo).then(commit => {
    if (commit) {
      return commit
    }

    return getRemoteCommitByGit(repo)
  })
}

async function readText(file: string): Promise<string | null> {
  if (await fs.pathExists(file)) {
    return (await fs.readFile(file, 'utf-8')).trim()
  }
  return null
}

async function getLocalCommit(commitFile: string, repo: string) {
  const sourceFile = path.join(path.dirname(commitFile), CACHE_SOURCE)
  const localSource = await readText(sourceFile)
  if (localSource !== repo) {
    return null
  }

  if (await fs.pathExists(commitFile)) {
    return (await fs.readFile(commitFile, 'utf-8')).trim()
  }
  return null
}

export async function diffCommit(
  repo: string,
  cachePath: string,
): Promise<{
  needsUpdate: boolean
  remoteCommit: string | null
}> {
  const commitFile = path.join(cachePath, '.commit-hash')
  const cacheFile = path.join(cachePath, CACHE_TEMPLATES)
  const sourceFile = path.join(cachePath, CACHE_SOURCE)
  const localSource = await readText(sourceFile)
  const isSameSource = localSource === repo
  const localCommit = await getLocalCommit(commitFile, repo)
  const hasCache = isSameSource && (await fs.pathExists(cacheFile))
  let remoteCommit: string | null
  try {
    remoteCommit = await getRemoteLatestCommit(repo)
  } catch {
    return {
      needsUpdate: localCommit === null || !hasCache,
      remoteCommit: null,
    }
  }

  if (!remoteCommit) {
    return {
      needsUpdate: localCommit === null || !hasCache,
      remoteCommit: null,
    }
  }

  if (!hasCache) {
    return { needsUpdate: true, remoteCommit }
  }

  if (localCommit === null || localCommit === '') {
    return { needsUpdate: true, remoteCommit }
  }

  const needsUpdate = localCommit !== remoteCommit
  return { needsUpdate, remoteCommit }
}

export async function updateLocalCommit(
  cachePath: string,
  commit: string | null,
  repo: string,
): Promise<void> {
  const commitFile = path.join(cachePath, '.commit-hash')
  const sourceFile = path.join(cachePath, CACHE_SOURCE)

  fs.ensureDirSync(cachePath)
  fs.writeFileSync(sourceFile, repo)
  if (commit !== null) {
    fs.writeFileSync(commitFile, commit)
  }
}
