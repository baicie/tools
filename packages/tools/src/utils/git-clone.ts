import path from 'node:path'
import fs from 'fs-extra'
import ora from 'ora'
import chalk from 'chalk'
import gitClone from 'git-clone'
import type { Logger } from '../logger'

export interface FileStat {
  name: string
  isDirectory: boolean
  isFile: boolean
}

export async function download(url: string, tempPath: string, logger?: Logger) {
  const spinner = ora(`正在从 ${url} 拉取...`).start()

  return new Promise<void>((resolve) => {
    if (url.endsWith('.git')) {
      const name = path.basename(url).replace('.git', '')

      gitClone(url, path.join(tempPath, name), { }, async (error) => {
        if (error) {
          logger?.error(error.message)
          spinner.color = 'red'
          spinner.fail(chalk.red('拉取仓库失败！'))
          await fs.remove(tempPath)
          return resolve()
        }

        // resolve(defaultFile(tempPath, spinner))
        spinner.color = 'green'
        spinner.succeed(`${chalk.green('拉取仓库成功！')}`)
        resolve()
      })
    }
  })
}

export function readDirWithFileTypes(folder: string): FileStat[] {
  const list = fs.readdirSync(folder)
  const res = list.map((name) => {
    const stat = fs.statSync(path.join(folder, name))
    return {
      name,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
    }
  })
  return res
}

// function defaultFile(folder: string, spinner: Ora) {
//   const files = readDirWithFileTypes(folder).filter(
//     file => !file.name.startsWith('.') && file.isDirectory && file.name !== '__MACOSX',
//   )

//   // 没有文件
//   if (files.length !== 1) {
//     spinner.color = 'red'
//     spinner.fail(chalk.red(`拉取仓库失败！\n${new Error('远程模板源组织格式错误')}`))
//     throw new Error('拉取仓库失败！')
//   }

//   spinner.color = 'green'
//   spinner.succeed(`${chalk.green('拉取仓库成功！')}`)

//   return files
// }
