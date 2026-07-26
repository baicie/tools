import { exec, execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { consola } from 'consola'
import chalk from 'picocolors'
import fs from 'fs-extra'
import ora from 'ora'
import type { IProjectConf } from '../steps'
import { templateRoot } from '../util'
import { createFiles } from './create-files'
import packagesManagement from './commands'
import { t } from '../util/i18n'

const execFileAsync = promisify(execFile)

export async function createApp(conf: IProjectConf): Promise<void> {
  const {
    projectName,
    template,
    autoInstall = false,
    npm,
    gitInit = false,
    gitRemote,
  } = conf
  conf.sourcePath = path.join(templateRoot, template)
  conf.targetPath = path.join(process.cwd(), projectName)

  if (!fs.existsSync(conf.sourcePath)) {
    consola.log(
      chalk.red(t('errors.templateNotFound', { sourcePath: conf.sourcePath })),
    )
    return
  }

  const logs = await createFiles(conf)
  await updateProjectPackage(conf.targetPath, projectName, conf.description)

  consola.log('')
  consola.log(
    `${chalk.green('OK')} ${chalk.green(
      t('info.projectCreated', { projectName }),
    )}`,
  )
  logs.forEach(log => consola.success(log))
  consola.log('')

  if (gitInit && conf.targetPath) {
    await initializeGit(conf.targetPath, gitRemote)
  }

  if (autoInstall) {
    const command: string = packagesManagement[npm].command
    const installSpinner = ora(t('info.installingDeps', { command })).start()
    const child = exec(command, { cwd: conf.targetPath }, error => {
      if (error) {
        installSpinner.color = 'red'
        installSpinner.fail(t('info.installFailed'))
        consola.error(error)
      } else {
        installSpinner.color = 'green'
        installSpinner.succeed(t('success.installSuccess'))
      }
      callSuccess(conf.targetPath)
    })

    child.stdout?.on('data', data => {
      installSpinner.stop()
      consola.log(data.replace(/\n$/, ''))
      installSpinner.start()
    })

    child.stderr?.on('data', data => {
      installSpinner.warn(data.replace(/\n$/, ''))
      installSpinner.start()
    })
  }
}

async function updateProjectPackage(
  targetPath: string | undefined,
  projectName: string,
  description: string,
): Promise<void> {
  if (!targetPath) return

  const packagePath = path.join(targetPath, 'package.json')
  if (!fs.existsSync(packagePath)) return

  const pkg = await fs.readJson(packagePath)
  pkg.name = projectName
  if (description) {
    pkg.description = description
  }
  await fs.writeJson(packagePath, pkg, { spaces: 2 })
}

async function initializeGit(
  targetPath: string,
  gitRemote?: string,
): Promise<void> {
  const gitInitSpinner = ora(t('info.gitInit', { command: 'git init' })).start()

  try {
    await execFileAsync('git', ['init'], { cwd: targetPath })
    gitInitSpinner.color = 'green'
    gitInitSpinner.succeed(t('success.gitInitSuccess'))
  } catch (error) {
    gitInitSpinner.color = 'red'
    gitInitSpinner.fail(t('info.gitInitFailed'))
    consola.error(error)
    return
  }

  if (!gitRemote) return

  const gitRemoteSpinner = ora(t('info.linkingRemote', { gitRemote })).start()
  try {
    await execFileAsync('git', ['remote', 'add', 'origin', gitRemote], {
      cwd: targetPath,
    })
    gitRemoteSpinner.color = 'green'
    gitRemoteSpinner.succeed(t('success.gitRemoteSuccess'))
  } catch (error) {
    gitRemoteSpinner.color = 'red'
    gitRemoteSpinner.fail(t('info.gitRemoteFailed'))
    consola.error(error)
  }
}

function callSuccess(projectName: string | undefined) {
  consola.log(t('info.projectCreated', { projectName }))
  consola.log(chalk.green(t('info.getStarted', { projectName })))
}
