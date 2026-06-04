/* eslint-disable no-restricted-globals */
import path from 'node:path'
import fs from 'fs-extra'
import { CACHE_TEMPLATES, TEMPLATE_CREATOR, templateRoot } from '../util'

import type { FileStat } from './download'
import { download, readDirWithFileTypes } from './download'
import { diffCommit, updateLocalCommit } from './commit-hash'
import type { IProjectConf } from '../steps'

export interface ITemplates {
  name: string
  platforms?: string | string[]
  desc?: string
}

const TEMP_DOWNLOAD_FOLDER = 'baicie-temp'
const TEMP_CACHE_FOLDER = 'baicie-temp-meta'

export async function fetchTemplate(
  repo: string,
  savePath: string,
  options: IProjectConf,
): Promise<ITemplates[]> {
  const { logger } = options
  // savePath templates/
  // tempPath templates/baicie-temp/
  const tempPath = path.join(savePath, TEMP_DOWNLOAD_FOLDER)
  const cachePath = path.join(savePath, TEMP_CACHE_FOLDER)
  logger.debug(`tempPath: ${tempPath}`)
  logger.debug(`cachePath: ${cachePath}`)
  fs.ensureDirSync(tempPath)
  fs.ensureDirSync(cachePath)
  const { needsUpdate, remoteCommit } = await diffCommit(repo, cachePath)

  if (!needsUpdate) {
    return JSON.parse(
      fs.readFileSync(path.join(cachePath, CACHE_TEMPLATES), 'utf-8'),
    )
  }

  let files: FileStat[] = []
  await fs.emptyDir(tempPath)
  files = await download(repo, tempPath)

  if (files.length === 0) {
    return []
  }

  const repos: FileStat[] = []

  files.forEach(file => {
    if (file.isDirectory) {
      const repoPath = path.join(tempPath, file.name)
      const res = readDirWithFileTypes(repoPath).filter(
        file =>
          !file.name.startsWith('.') &&
          file.isDirectory &&
          file.name !== '__MACOSX',
      )
      repos.push(...res)
    }
  })

  const name = files[0].name
  const templateFolder = name ? path.join(tempPath, name) : ''

  const isTemplateGroup = !fs.existsSync(
    path.join(templateFolder, 'package.json'),
  )

  let res: ITemplates[] = []

  if (isTemplateGroup) {
    // 拷贝解压后文件
    await Promise.all(
      repos.map(file => {
        const destPath = path.join(templateRoot, file.name)
        const sourcePath = path.join(templateFolder, file.name)

        fs.mkdirSync(destPath, { recursive: true })
        return fs.move(sourcePath, destPath, { overwrite: true })
      }),
    )
    // 清除缓存文件
    // await fs.remove(tempPath);

    res = repos.map(file => {
      // 读取模板配置
      const creatorFile = path.join(savePath, file.name, TEMPLATE_CREATOR)

      if (!fs.existsSync(creatorFile)) return { name: file.name }

      const { platforms = '', desc = '' } = require(creatorFile)

      return {
        name: file.name,
        platforms,
        desc,
      }
    })
  } else {
    // 单模板
    await fs.move(templateFolder, path.join(templateRoot, name), {
      overwrite: true,
    })
    // await fs.remove(tempPath);

    res = [{ name }]
    const creatorFile = path.join(templateRoot, name, TEMPLATE_CREATOR)

    if (fs.existsSync(creatorFile)) {
      const { platforms = '', desc = '' } = require(creatorFile)

      res = [
        {
          name,
          platforms,
          desc,
        },
      ]
    }
  }

  fs.writeFileSync(path.join(cachePath, CACHE_TEMPLATES), JSON.stringify(res))
  await updateLocalCommit(cachePath, remoteCommit, repo)

  return res
}
