import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

export const isWindows = os.platform() === 'win32'

export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id)
}

const windowsSlashRE = /\\/g
export function slash(p: string): string {
  return p.replace(windowsSlashRE, '/')
}

// eslint-disable-next-line no-new-func
export const dynamicImport = new Function('file', 'return import(file)')

export function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export type ValueTypes<T> = T[keyof T]

// 获取软连接地址
export function resolveSymbolicLink(id: string): string {
  return isWindows ? fs.readlinkSync(id) : fs.realpathSync.native(id)
}

export function tranformPath(id: string): URL {
  return new URL(`file:///${id}`)
}
