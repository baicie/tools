import path from 'node:path'
import glob from 'fast-glob'
import fs from 'fs-extra'
import chalk from 'picocolors'
import type { IProjectConf } from '../steps'
import { TEMPLATE_CREATOR, excludeFiles } from '../util'
import { t } from '../util/i18n'

export async function createFiles(conf: IProjectConf): Promise<string[]> {
  const excludes = [
    'node_modules',
    'mock',
    'gulpfile',
    'dist',
    '.git/',
    TEMPLATE_CREATOR,
  ]
  const files = excludeFiles(
    await glob('**/**', {
      cwd: conf.sourcePath,
      onlyFiles: true,
      dot: true,
    }),
    excludes,
  )

  // 可以换成同步
  files.map(async file => {
    if (!conf.sourcePath || !conf.targetPath) return
    const sourcePath = path.join(conf.sourcePath, file)
    const targetPath = path.join(conf.targetPath, file)

    if (!fs.existsSync(path.dirname(targetPath)))
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })

    await fs.copy(sourcePath, targetPath, { overwrite: true })

    return `${chalk.green(t('info.creatingFile', { targetPath }))}`
  })

  const res = await Promise.all(files)

  return res
}
