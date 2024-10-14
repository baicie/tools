import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import process from 'node:process'
import os from 'node:os'

const isWindows = os.platform() === 'win32'
const windowsSlashRE = /\\/g

function slash(p) {
  return p.replace(windowsSlashRE, '/')
}
function normalizePath(id) {
  return path.posix.normalize(isWindows ? slash(id) : id)
}

function execSyncPath(commond) {
  return execSync(commond, { encoding: 'utf-8' }).replace('\n', '')
}

function main() {
  const globalPath = execSyncPath('npm root -g')
  const modulePath = execSyncPath('npm root')

  const isGlobal = globalPath === modulePath

  if (isGlobal) {
    const cachePath = normalizePath(path.resolve(globalPath, '.bcz.cache'))

    if (!fs.existsSync(cachePath))
      fs.mkdirSync(cachePath)

    const configFile = normalizePath(path.resolve(cachePath, 'bcz.confit.ts'))
    const tempaltePath = normalizePath(path.resolve(process.cwd(), 'bin', 'template.ts'))

    fs.copyFileSync(tempaltePath, configFile)
  }
}

try {
  main()
}
catch (error) {
  console.error(error)
}
