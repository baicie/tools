import path from 'node:path'
import { exec } from 'node:child_process'
import { consola } from 'consola'
import chalk from 'picocolors'
import fs from 'fs-extra'
import ora from 'ora'
import type { IProjectConf } from '../steps'
import { templateRoot } from '../util'
import { createFiles } from './create-files'
import packagesManagement from './commands'
import { t } from '../util/i18n'

export async function createApp(conf: IProjectConf): Promise<void> {
  // 目标文件夹 和源文件夹
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

  if (!fs.existsSync(conf.sourcePath))
    return consola.log(
      chalk.red(t('errors.templateNotFound', { sourcePath: conf.sourcePath })),
    )

  const logs = await createFiles(conf)

  consola.log('')
  consola.log(
    `${chalk.green('✔ ')}${chalk.green(
      t('info.projectCreated', { projectName }),
    )}`,
  )
  logs.forEach(log => consola.success(log))
  consola.log('')

  process.chdir(conf.targetPath)

  // 初始化 Git 仓库并关联远程仓库
  if (gitInit) {
    // 初始化 Git 仓库
    const gitInitSpinner = ora(
      t('info.gitInit', { command: 'git init' }),
    ).start()
    const gitInitProcess = exec('git init')

    gitInitProcess.on('close', code => {
      if (code === 0) {
        gitInitSpinner.color = 'green'
        gitInitSpinner.succeed(t('success.gitInitSuccess'))

        // 如果提供了远程仓库地址，则关联远程仓库
        if (gitRemote) {
          const gitRemoteSpinner = ora(
            t('info.linkingRemote', { gitRemote }),
          ).start()
          const addRemote = exec(`git remote add origin ${gitRemote}`)

          addRemote.on('close', remoteCode => {
            if (remoteCode === 0) {
              gitRemoteSpinner.color = 'green'
              gitRemoteSpinner.succeed(t('success.gitRemoteSuccess'))
            } else {
              gitRemoteSpinner.color = 'red'
              gitRemoteSpinner.fail(t('info.gitRemoteFailed'))
              consola.error(addRemote.stderr?.read())
            }
          })
        }
      } else {
        gitInitSpinner.color = 'red'
        gitInitSpinner.fail(t('info.gitInitFailed'))
        consola.error(gitInitProcess.stderr?.read())
      }
    })
  }

  if (autoInstall) {
    // 安装
    const command: string = packagesManagement[npm].command
    const installSpinner = ora(t('info.installingDeps', { command })).start()

    // 执行命令
    const child = exec(command, error => {
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

    // 输出
    child.stdout!.on('data', data => {
      installSpinner.stop()
      consola.log(data.replace(/\n$/, ''))
      installSpinner.start()
    })

    // 输出 错误信息
    child.stderr!.on('data', data => {
      installSpinner.warn(data.replace(/\n$/, ''))
      installSpinner.start()
    })
  }
}

function callSuccess(projectName: string | undefined) {
  consola.log(t('info.projectCreated', { projectName }))
  consola.log(chalk.green(t('info.getStarted', { projectName })))
}
