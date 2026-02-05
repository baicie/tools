import path from 'node:path'
import fs from 'fs-extra'
import request from 'request'
import type { Ora } from 'ora'
import ora from 'ora'
import chalk from 'picocolors'
import AdmZip from 'adm-zip'
import gitClone from 'git-clone'
import { consola } from 'consola'
import { t } from '../util/i18n'

export interface FileStat {
  name: string
  isDirectory: boolean
  isFile: boolean
}

// tempPath templates/baicie-temp /temp.zip
export async function download(
  url: string,
  tempPath: string,
): Promise<FileStat[]> {
  const spinner = ora(t('info.downloadingTemplate', { url })).start()
  const zipPath = path.join(tempPath, 'temp.zip')

  return new Promise<FileStat[]>(resolve => {
    if (url.endsWith('.git')) {
      const name = path.basename(url).replace('.git', '')

      gitClone(url, path.join(tempPath, name), {}, async (error: unknown) => {
        if (error) {
          consola.log(error)
          spinner.color = 'red'
          spinner.fail(t('info.downloadFailed'))
          await fs.remove(tempPath)
          return resolve([])
        }

        resolve(defaultFile(tempPath, spinner))
      })
    } else {
      request(url)
        .pipe(fs.createWriteStream(zipPath))
        .on('close', () => {
          // 解压
          const zip = new AdmZip(zipPath)
          zip.extractAllTo(tempPath, true)
          // 过滤文件
          resolve(defaultFile(tempPath, spinner))
        })
        .on('error', async _err => {
          spinner.color = 'red'
          spinner.fail(t('info.downloadFailed'))
          await fs.remove(tempPath)
          return resolve([])
        })
    }
  })
}

export function readDirWithFileTypes(folder: string): FileStat[] {
  const list = fs.readdirSync(folder)
  const res = list.map(name => {
    const stat = fs.statSync(path.join(folder, name))
    return {
      name,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
    }
  })
  return res
}

function defaultFile(folder: string, spinner: Ora) {
  const files = readDirWithFileTypes(folder).filter(
    file =>
      !file.name.startsWith('.') &&
      file.isDirectory &&
      file.name !== '__MACOSX',
  )

  // 没有文件
  if (files.length !== 1) {
    spinner.color = 'red'
    spinner.fail(
      chalk.red(
        `${t('info.downloadFailed')}\n${new Error(t('info.invalidTemplateFormat'))}`,
      ),
    )
    throw new Error(t('info.downloadFailed'))
  }

  spinner.color = 'green'
  spinner.succeed(t('success.downloadSuccess'))

  return files
}
