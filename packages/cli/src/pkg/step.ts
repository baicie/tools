import { select, text } from '@clack/prompts'
import { isValidPackageName } from '../util'

/**
 * 询问包名
 */
export async function askPackageName(defaultName?: string): Promise<string> {
  const value = await text({
    message: '包名 (package name)?',
    placeholder: defaultName || '',
    validate: (value: string | undefined): string | Error | undefined => {
      if (!value || value.trim() === '') {
        return '包名不能为空'
      }
      if (!isValidPackageName(value)) {
        return '请输入有效的包名（只能包含小写字母、数字、连字符、下划线和点，可以包含 @scope/）'
      }
      return undefined
    },
  })

  if (typeof value === 'symbol') {
    return askPackageName(defaultName)
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
    message: '版本号 (version)?',
    placeholder: defaultVersion || '0.1.0',
    validate: (value: string | undefined): string | Error | undefined => {
      if (!value || value.trim() === '') {
        return '版本号不能为空'
      }
      // 简单的版本号验证（semver 格式）
      if (!/^\d+\.\d+\.\d+/.test(value)) {
        return '请输入有效的版本号（格式: x.y.z，例如 0.1.0）'
      }
      return undefined
    },
  })

  if (typeof value === 'symbol') {
    return askPackageVersion(defaultVersion)
  }

  return value
}

/**
 * 询问包描述
 */
export async function askPackageDescription(): Promise<string> {
  const value = await text({
    message: '包描述 (description)?',
    placeholder: '',
  })

  if (typeof value === 'symbol') {
    return askPackageDescription()
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
      label: '基础项目 (basic)',
      value: 'basic' as const,
    },
    {
      label: '库项目 (library)',
      value: 'library' as const,
    },
  ]

  const value = await select({
    message: '请选择预设类型 (preset)?',
    options: choices,
    initialValue: defaultPreset || 'basic',
  })

  if (typeof value === 'symbol') {
    return askPackagePreset(defaultPreset)
  }

  return value
}
