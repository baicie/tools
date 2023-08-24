import path from 'node:path'
import fs from 'fs-extra'
import { Octokit } from 'octokit'
import type { Logger } from '../logger'
import { download } from '../utils'

interface GitOptions {
  /**
   * gihub token at https://github.com/settings/tokens/new?scopes=repo
   */
  token?: string
  /**
   * 工作目录
   */
  root?: string
  /**
   * 是否解压
   */
  unzip?: boolean
  // 单线程多线程下载？
}

export async function backupService(options: GitOptions, extra: {
  logger: Logger
}) {
  const logger = extra.logger
  const root = path.resolve(process.cwd(), options?.root || 'backup')

  // logger.warn()
  if (!fs.existsSync(root))
    fs.mkdirSync(root)
  else
    fs.emptyDirSync(root)

  const octokit = new Octokit({ auth: options.token })

  const {
    data: { login },
  } = await octokit.rest.users.getAuthenticated()

  logger.info(`Hello, %s${login}`)

  const { data } = await octokit.rest.repos.listForAuthenticatedUser()

  for (const item of data.filter(item => !item.fork)) {
    const savePath = path.resolve(root, item.name)
    logger.info(`savePath:${savePath}`)
    await download(item.clone_url, root, logger)
  }
}
