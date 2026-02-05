import { select, text } from '@clack/prompts'
import { isValidPackageName } from '../util'
import { CancelError } from '../util/cancel'
import { t } from '../util/i18n'

/**
 * 询问包名
 */
export async function askPackageName(defaultName?: string): Promise<string> {
  const value = await text({
    message: t('command.pkg.packageName'),
    placeholder: defaultName || '',
    validate: (value: string | undefined): string | Error | undefined => {
      if (!value || value.trim() === '') {
        return t('command.pkg.packageNameRequired')
      }
      if (!isValidPackageName(value)) {
        return t('command.pkg.packageNameInvalid')
      }
      return undefined
    },
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancel'))
  }

  return value
}

/**
 * 询问包版本
 */
export async function askPackageVersion(
  defaultVersion?: string,
): Promise<string> {
  const value = await text({
    message: t('command.pkg.version'),
    placeholder: defaultVersion || '0.1.0',
    validate: (value: string | undefined): string | Error | undefined => {
      if (!value || value.trim() === '') {
        return t('command.pkg.versionRequired')
      }
      // 简单的版本号验证（semver 格式）
      if (!/^\d+\.\d+\.\d+/.test(value)) {
        return t('command.pkg.versionInvalid')
      }
      return undefined
    },
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancel'))
  }

  return value
}

/**
 * 询问包描述
 */
export async function askPackageDescription(): Promise<string> {
  const value = await text({
    message: t('command.pkg.description'),
    placeholder: '',
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancel'))
  }

  return value
}

/**
 * 询问预设类型
 */
export async function askPackagePreset(
  defaultPreset?: 'basic' | 'library',
): Promise<'basic' | 'library'> {
  const choices = [
    {
      label: t('command.pkg.presetBasic'),
      value: 'basic' as const,
    },
    {
      label: t('command.pkg.presetLibrary'),
      value: 'library' as const,
    },
  ]

  const value = await select({
    message: t('command.pkg.preset'),
    options: choices,
    initialValue: defaultPreset || 'basic',
  })

  if (typeof value === 'symbol') {
    throw new CancelError(t('errors.cancel'))
  }

  return value
}
