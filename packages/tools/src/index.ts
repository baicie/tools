import cac from 'cac'
import consola from 'consola'
import picocolors from 'picocolors'
import { createLogger } from './logger'

const cli = cac('too')
const logger = createLogger()

cli
  .command('[root]', 'start dev server')
  .action(async () => {
    try {
      logger.info(picocolors.bgCyan(picocolors.blue('hello, woyanzu')))
    }
    catch (error) {
      process.exit(1)
    }
  })

cli
  .command('backup [...external]', 'backup workkspace')
  .option('-s,--source <source>', '[string] source path to backup')
  .option('-o,--output <output>', '[string] output path to backup')
  .option('-e,--external ', 'external files backup')
  .option('-r,--root <root>', 'cwd ')
  .action(async (sources, options) => {
    const { backupService } = await import('./server/backup')
    try {
      consola.info(sources, options)
      await backupService(options, {
        logger,
      })
    }
    catch (error) {
      logger.error(picocolors.red(error))
      process.exit(1)
    }
  })

cli
  .command('backgit', 'backup github files')
  .option('-t,--token <token>', 'token')
  .option('-r,--root <root>', 'cwd')
  .option('-u,--unzip <boolean>', 'unzip')
  .action(async (options) => {
    const { backupService } = await import('./server/git-backup')
    try {
      await backupService(options, {
        logger,
      })
    }
    catch (error) {
      logger.error(picocolors.red(error))
      process.exit(1)
    }
  })

cli.help()

cli.parse()
