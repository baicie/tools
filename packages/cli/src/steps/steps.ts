import fs from 'fs-extra'
import { confirm, select, text } from '@clack/prompts'
import {
  DEFAULT_TEMPLATE_SRC,
  DEFAULT_TEMPLATE_SRC_GITEE,
  isEmpty,
  isValidPackageName,
} from '../util'
import { CancelError } from '../util/cancel'
import { t } from '../util/i18n'

import type { ITemplates } from '../download'
import type { IProjectConf } from './types'

export async function askProjectName(): Promise<string> {
  const value = await text({
    message: t('command.create.projectName'),
    placeholder: t('command.create.placeholder'),
    validate: (value: string | undefined): string | Error | undefined => {
      if (!value || value.trim() === '') {
        return t('command.create.invalidName')
      }
      if (!isValidPackageName(value)) {
        return t('command.create.invalidName')
      }
      return undefined
    },
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancel'))
  }

  const projectName = value

  // 存在且不为空
  if (fs.existsSync(projectName) && !isEmpty(projectName)) {
    const choices = [
      {
        label: t('action.overwrite'),
        value: 'overwrite',
      },
      {
        label: t('action.merge'),
        value: 'merge',
      },
      {
        label: t('action.cancel'),
        value: 'cancel',
      },
    ]

    const modeValue = await select({
      message: t('exists.message', { dir: projectName }),
      options: choices,
    })

    if (typeof modeValue === 'symbol') {
      throw new CancelError(t('errors.cancel'))
    }

    switch (modeValue) {
      case 'overwrite':
        fs.removeSync(projectName)
        break
      case 'merge':
        break
      case 'cancel':
        throw new CancelError(t('errors.cancel'))
      default:
        break
    }
  }

  return projectName
}

export async function askDescription(): Promise<string> {
  const value = await text({
    message: t('command.create.description'),
    placeholder: '',
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancelDescription'))
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
    message: t('command.create.packageManager'),
    options: choices,
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancelNpm'))
  }

  return value as IProjectConf['npm']
}

export async function askSelfInputTemplateSource(): Promise<string> {
  const value = await text({
    message: t('info.fetchingTemplate'),
    placeholder: '',
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancelGitInput'))
  }

  return value
}

export async function askGitInit(): Promise<boolean> {
  const value = await confirm({
    message: t('command.create.gitInit'),
    initialValue: false,
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancelGitInit'))
  }

  return value
}

export async function askGitRemote(): Promise<string> {
  const value = await text({
    message: t('command.create.remoteRepo'),
    placeholder: '',
    validate: (inputValue: string | undefined): string | Error | undefined => {
      if (!inputValue) return t('errors.invalidRepo')
      if (
        !(
          inputValue.endsWith('.git') ||
          inputValue.includes('github.com') ||
          inputValue.includes('gitlab') ||
          inputValue.includes('gitee.com')
        )
      ) {
        return t('errors.invalidGitRepo')
      }
      return undefined
    },
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancelGitRemote'))
  }

  return value
}

export async function askTemplateSource(): Promise<
  'default-template' | 'self-input' | string
> {
  const choices = [
    {
      label: t('templateSource.githubLatest'),
      value: DEFAULT_TEMPLATE_SRC,
    },
    {
      label: t('templateSource.giteeFastest'),
      value: DEFAULT_TEMPLATE_SRC_GITEE,
    },
    {
      label: t('templateSource.builtin'),
      value: 'default-template',
    },
    {
      label: t('templateSource.custom'),
      value: 'self-input',
    },
  ]

  const value = await select({
    message: t('command.create.templateSource'),
    options: choices,
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancelTemplateSource'))
  }

  return value
}

export async function askTemplate(
  list: ITemplates[],
): Promise<'default' | string> {
  const choices = [
    {
      label: t('action.defaultTemplate'),
      value: 'default',
    },
    ...list.map(item => ({
      label: item.desc ? `${item.name}（${item.desc}）` : item.name,
      value: item.name,
    })),
  ]

  const value = await select({
    message: t('command.create.template'),
    options: choices,
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancelTemplate'))
  }

  return value
}

export async function askAutoInstall(): Promise<boolean> {
  const value = await confirm({
    message: t('command.create.autoInstall'),
    initialValue: false,
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancelAutoInstall'))
  }

  return value
}
