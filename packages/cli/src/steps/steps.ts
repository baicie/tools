import fs from 'fs-extra'
import { confirm, select, text } from '@clack/prompts'
import chalk from 'picocolors'
import {
  DEFAULT_TEMPLATE_SRC,
  DEFAULT_TEMPLATE_SRC_GITEE,
  isEmpty,
  isValidPackageName,
} from '../util'

import type { ITemplates } from '../download'
import type { IProjectConf } from './types'

const defaultTargetDir = 'my-project'

export async function askProjectName(): Promise<string> {
  const value = await text({
    message: '项目名称?',
    placeholder: defaultTargetDir,
    validate: (value: string | undefined): string | Error | undefined => {
      if (!value || value.trim() === '') {
        return '请输入有效的项目名称'
      }
      if (!isValidPackageName(value)) {
        return '请输入有效的项目名称'
      }
      return undefined
    },
  })

  if (typeof value === 'symbol') {
    return askProjectName()
  }

  const projectName = value

  // 存在且不为空
  if (fs.existsSync(projectName) && !isEmpty(projectName)) {
    const choices = [
      {
        label: '覆写',
        value: 'overwrite',
      },
      {
        label: '合并',
        value: 'merge',
      },
      {
        label: '取消',
        value: 'cancel',
      },
    ]

    const modeValue = await select({
      message: `当前目录${projectName}已经存在同名项目，是否覆写?`,
      options: choices,
    })

    if (typeof modeValue === 'symbol') {
      return askProjectName()
    }

    switch (modeValue) {
      case 'overwrite':
        fs.removeSync(projectName)
        break
      case 'merge':
        break
      case 'cancel':
        throw new Error(chalk.red('取消创建'))
      default:
        break
    }
  }

  return projectName
}

export async function askDescription(): Promise<string> {
  const value = await text({
    message: '请输入项目介绍',
    placeholder: '',
  })

  if (typeof value === 'symbol') {
    return askDescription()
  }

  return value
}

export async function askNpm(): Promise<IProjectConf['npm']> {
  const choices = [
    {
      label: 'pnpm',
      value: 'pnpm',
    },
    {
      label: 'yarn',
      value: 'yarn',
    },
    {
      label: 'npm',
      value: 'npm',
    },
    {
      label: 'cnpm',
      value: 'cnpm',
    },
  ]

  const value = await select({
    message: '请选择包管理工具',
    options: choices,
  })

  if (typeof value === 'symbol') {
    return askNpm()
  }

  return value as IProjectConf['npm']
}

export async function askSelfInputTemplateSource(): Promise<string> {
  const value = await text({
    message: '请输入github地址',
    placeholder: '',
  })

  if (typeof value === 'symbol') {
    return askSelfInputTemplateSource()
  }

  return value
}

export async function askGitInit(): Promise<boolean> {
  const value = await confirm({
    message: '是否需要初始化 Git 仓库?',
    initialValue: false,
  })

  if (typeof value === 'symbol') {
    return askGitInit()
  }

  return value
}

export async function askGitRemote(): Promise<string> {
  const value = await text({
    message: '请输入远程仓库地址 (例如: https://github.com/username/repo.git)',
    placeholder: '',
    validate: (inputValue: string | undefined): string | Error | undefined => {
      if (!inputValue) return '请输入有效的仓库地址'
      if (
        !(
          inputValue.endsWith('.git') ||
          inputValue.includes('github.com') ||
          inputValue.includes('gitlab') ||
          inputValue.includes('gitee.com')
        )
      ) {
        return '请输入有效的 Git 仓库地址'
      }
      return undefined
    },
  })

  if (typeof value === 'symbol') {
    return askGitRemote()
  }

  return value
}

export async function askTemplateSource(): Promise<
  'default-template' | 'self-input' | string
> {
  const choices = [
    {
      label: 'Github（最新）',
      value: DEFAULT_TEMPLATE_SRC,
    },
    {
      label: 'Gitee（最快）',
      value: DEFAULT_TEMPLATE_SRC_GITEE,
    },
    {
      label: 'CLI 内置默认模板',
      value: 'default-template',
    },
    {
      label: '自定义',
      value: 'self-input',
    },
  ]

  const value = await select({
    message: '请选择模板源',
    options: choices,
  })

  if (typeof value === 'symbol') {
    return askTemplateSource()
  }

  return value
}

export async function askTemplate(
  list: ITemplates[],
): Promise<'default' | string> {
  const choices = [
    {
      label: '默认模板',
      value: 'default',
    },
    ...list.map(item => ({
      label: item.desc ? `${item.name}（${item.desc}）` : item.name,
      value: item.name,
    })),
  ]

  const value = await select({
    message: '请选择模板',
    options: choices,
  })

  if (typeof value === 'symbol') {
    return askTemplate(list)
  }

  return value
}

export async function askAutoInstall(): Promise<boolean> {
  const value = await confirm({
    message: '是否需要自动安装依赖?',
    initialValue: false,
  })

  if (typeof value === 'symbol') {
    return askAutoInstall()
  }

  return value
}
