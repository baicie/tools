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
    return consola.log(chalk.red(`创建页面错误：找不到模板${conf.sourcePath}`))

  const logs = await createFiles(conf)

  consola.log('')
  consola.log(
    `${chalk.green('✔ ')}${chalk.green(
      `创建项目: ${chalk.green(projectName)}`,
    )}`,
  )
  logs.forEach(log => consola.success(log))
  consola.log('')

  process.chdir(conf.targetPath)

  // 初始化 Git 仓库并关联远程仓库
  if (gitInit) {
    // 初始化 Git 仓库
    const gitInitSpinner = ora(`执行 ${chalk.cyan('git init')}`).start()
    const gitInitProcess = exec('git init')

    gitInitProcess.on('close', code => {
      if (code === 0) {
        gitInitSpinner.color = 'green'
        gitInitSpinner.succeed('Git 初始化成功')

        // 如果提供了远程仓库地址，则关联远程仓库
        if (gitRemote) {
          const gitRemoteSpinner = ora(
            `关联远程仓库 ${chalk.cyan(gitRemote)}`,
          ).start()
          const addRemote = exec(`git remote add origin ${gitRemote}`)

          addRemote.on('close', remoteCode => {
            if (remoteCode === 0) {
              gitRemoteSpinner.color = 'green'
              gitRemoteSpinner.succeed('远程仓库关联成功')
            } else {
              gitRemoteSpinner.color = 'red'
              gitRemoteSpinner.fail('远程仓库关联失败')
              consola.error(addRemote.stderr?.read())
            }
          })
        }
      } else {
        gitInitSpinner.color = 'red'
        gitInitSpinner.fail('Git 初始化失败')
        consola.error(gitInitProcess.stderr?.read())
      }
    })
  }

  if (autoInstall) {
    // 安装
    const command: string = packagesManagement[npm].command
    const installSpinner = ora(
      `执行安装项目依赖 ${chalk.cyan(command)}, 需要一会儿...`,
    ).start()

    // 执行命令
    const child = exec(command, error => {
      if (error) {
        installSpinner.color = 'red'
        installSpinner.fail(chalk.red('安装项目依赖失败，请自行重新安装！'))
        consola.error(error)
      } else {
        installSpinner.color = 'green'
        installSpinner.succeed('安装成功')
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
  consola.log(chalk.green(`创建项目 ${chalk.green(projectName ?? '')} 成功！`))
  consola.log(
    chalk.green(
      `请进入项目目录 ${chalk.green(projectName ?? '')} 开始工作吧！😝`,
    ),
  )
}
