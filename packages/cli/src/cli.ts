import { cac } from 'cac'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import chalk from 'picocolors'
import { ask, write } from '.'
import type { IProjectConf } from './steps'
import { DEFAULT_TEMPLATE_SRC } from './util'
import { createLogger } from './util/logger'
import type { IPkgOptions } from './pkg'
import { pkg } from './pkg'
import { CancelError } from './util/cancel'
import type { Locale } from './util/i18n'
import { setLocale, t } from './util/i18n'

const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url)).toString(),
)

// 标志：是否正在等待用户输入
let isPrompting = false

// 设置 SIGINT 信号处理（支持 Ctrl+C 强制退出）
process.on('SIGINT', () => {
  if (isPrompting) {
    console.info(`\n👋 ${t('info.userInterrupted')}`)
    process.exit(130)
  }
})

const cli = cac('bca')

cli.option(
  '-l, --lang <lang>',
  'Language (zh-CN, en-US, zh-TW, ja-JP, ko-KR)',
  {
    default: undefined,
  },
)

cli.option('-d, --debug [feat]', `[string | boolean] show debug logs`)

cli
  .command('[root]', 'start a new project')
  .option('-des, --description <description>', 'description of the project')
  .option('-n, --npm <npm>', 'npm of the project', { default: 'pnpm' })
  .option(
    '-ts, --template-source <template-source>',
    'template source of the project',
    {
      default: DEFAULT_TEMPLATE_SRC,
    },
  )
  .option('-t, --template <template>', 'template of the project')
  .option('-i, --auto-install [auto-install]', 'auto install of the project', {
    default: false,
  })
  .option('-gi, --git-init [git-init]', 'git init of the project', {
    default: false,
  })
  .option('-gr, --git-remote <git-remote>', 'git remote of the project')
  .action(async (root: string, options: IProjectConf & { lang?: Locale }) => {
    // 设置语言
    if (options.lang) {
      setLocale(options.lang)
    }

    const logger = createLogger({ debug: options.debug, prefix: '[create]' })
    logger.debug(`start a new project ${root}`)
    logger.debug(`options is ${JSON.stringify(options)}`)
    logger.debug(`current locale: ${options.lang || 'auto-detect'}`)
    try {
      isPrompting = true
      const answers = await ask({ ...options, projectName: root, logger })
      isPrompting = false
      await write(answers)
    } catch (error) {
      isPrompting = false
      if (error instanceof CancelError) {
        console.info(`\n👋 ${t('info.cancelled')}`)
        process.exit(130)
      }
      logger.error(chalk.red(t('errors.createFailed', { reason: error })))
    }
  })

cli
  .command('pkg [root]', 'Format or create package.json file')
  .option('-c, --create', 'Create a new package.json file', {
    default: false,
  })
  .option('-f, --format', 'Format existing package.json file', {
    default: true,
  })
  .option('-p, --preset <preset>', 'Preset of the project')
  .option('-n, --name <name>', 'Package name (for create)')
  .option('-pv, --pkg-version <pkg-version>', 'Package version (for create)', {
    default: '0.1.0',
  })
  .option('--description <description>', 'Package description (for create)')
  .action(
    async (root: string = '.', options: IPkgOptions & { lang?: Locale }) => {
      // 设置语言
      if (options.lang) {
        setLocale(options.lang)
      }

      const logger = createLogger({
        debug: options.debug || false,
        prefix: '[pkg]',
      })
      logger.debug(`root parameter: ${JSON.stringify(root)}`)
      logger.debug(`process.cwd(): ${process.cwd()}`)
      const targetDir = resolve(process.cwd(), root)
      logger.debug(`targetDir: ${targetDir}`)
      const pkgPath = resolve(targetDir, 'package.json')
      logger.debug(`pkgPath: ${pkgPath}`)

      try {
        isPrompting = true
        await pkg(options, logger, pkgPath)
        isPrompting = false
      } catch (error) {
        isPrompting = false
        if (error instanceof CancelError) {
          console.info(`\n👋 ${t('info.cancelled')}`)
          process.exit(130)
        }
        logger.error(t('errors.pkgFailed', { reason: error }))
      }
    },
  )

cli.help()
cli.version(version)

cli.parse()
