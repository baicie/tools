import path from 'node:path'
import fs from 'fs-extra'
import picocolors from 'picocolors'
import ora from 'ora'
import type { Logger } from '../logger'

//
interface BackUpOptions {
  source?: string
  output?: string
  root?: string
}
export async function backupService(options: BackUpOptions, extra: {
  logger: Logger
}) {
  const logger = extra.logger

  if (!(options.output && options.source)) {
    logger.warn('backup output and sources is required')
    return
  }

  const root = path.resolve(process.cwd(), options.root || '')
  const output = path.resolve(root, options.output)
  const source = path.resolve(root, options.source)

  if (!fs.existsSync(output))
    fs.mkdirSync(output, { recursive: true })

  const spinner = ora(`backup projects from ${picocolors.cyan(source)} to ${picocolors.cyan(output)}`).start()
  try {
    fs.copyFileSync(source, output)
    spinner.color = 'green'
    spinner.succeed('backup successfully')
  }
  catch (error) {
    spinner.color = 'red'
    spinner.fail('backup failed')
    logger.error(picocolors.red(error))
  }
}
