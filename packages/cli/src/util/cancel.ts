import { t } from './i18n'

/**
 * 用户取消操作的错误类
 */
export class CancelError extends Error {
  constructor(message?: string) {
    super(message || t('errors.cancel'))
    this.name = 'CancelError'
  }
}

/**
 * 检查值是否为取消符号
 */
export function isCancel(value: unknown): value is symbol {
  return typeof value === 'symbol'
}
