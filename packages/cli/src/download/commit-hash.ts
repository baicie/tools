import request from 'request'
import { TEMPLATE_COMMIT } from '../util'
import fs from 'fs-extra'
import path from 'node:path'

function getRemoteLatestCommit() {
  const url = TEMPLATE_COMMIT
  return new Promise<string>((resolve, reject) => {
    request(
      { url, headers: { 'User-Agent': '@baicie/cli' }, json: true },
      (err, res, body) => {
        if (err) return reject(err)
        if (res.statusCode !== 200) {
          resolve('')
        }
        resolve(body.sha)
      },
    )
  })
}

async function getLocalCommit(commitFile: string) {
  if (await fs.pathExists(commitFile)) {
    return (await fs.readFile(commitFile, 'utf-8')).trim()
  }
  return null
}

export async function diffCommit(tempPath: string): Promise<{
  needsUpdate: boolean
  remoteCommit: string | null
}> {
  const commitFile = path.join(tempPath, '.commit-hash')
  const localCommit = await getLocalCommit(commitFile)
  let remoteCommit: string | null
  try {
    remoteCommit = await getRemoteLatestCommit()
  } catch {
    return { needsUpdate: false, remoteCommit: null }
  }

  if (!remoteCommit) {
    return { needsUpdate: false, remoteCommit: null }
  }

  if (localCommit === null || localCommit === '') {
    return { needsUpdate: true, remoteCommit }
  }

  const needsUpdate = localCommit !== remoteCommit
  return { needsUpdate, remoteCommit }
}

export async function updateLocalCommit(
  tempPath: string,
  commit: string,
): Promise<void> {
  const commitFile = path.join(tempPath, '.commit-hash')
  fs.writeFileSync(commitFile, commit)
}
