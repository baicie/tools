import type { ReleaseConfig } from './types'
import type { AppJsonConfig } from './types'

import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import semver from 'semver'

export type { AppJsonConfig } from './types'

export interface AppJsonLike {
  expo?: {
    name?: string
    slug?: string
    version?: string
    ios?: { buildNumber?: string; [key: string]: unknown }
    android?: {
      versionCode?: number
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface SyncAppJsonOptions {
  cwd: string
  config: AppJsonConfig
  version: string
  /**
   * true 时只打印意图，不写盘。
   */
  dryRun?: boolean
}

export interface SyncAppJsonResult {
  /** 是否真的改了文件（dry-run 时为 false；app.json 不存在时为 false） */
  changed: boolean
  /** 解析出的 app.json。文件不存在时为 null。 */
  appJson: AppJsonLike | null
  /** 解析后的最终 file 路径（绝对路径）。 */
  filePath: string
  /** 写入 expo.version 的最终值 */
  versionName: string
  /** 写入 expo.android.versionCode 的最终值；没更新时为 undefined */
  versionCode: number | undefined
  /** 是否进入 dry-run */
  dryRun: boolean
}

function stripPrerelease(version: string): string {
  const parsed = semver.parse(version)
  if (!parsed) return version
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`
}

function resolveVersionName(
  version: string,
  strategy: AppJsonConfig['versionNameStrategy'],
): string {
  if (strategy === 'strip-prerelease') return stripPrerelease(version)
  return version
}

function resolveVersionCode(
  config: AppJsonConfig['versionCode'],
  current: number | undefined,
): number | undefined {
  if (config === undefined || config === null) return undefined
  if (config === 'auto') {
    if (typeof current !== 'number' || !Number.isFinite(current)) {
      throw new Error(
        'appJson.versionCode="auto" requires existing expo.android.versionCode to increment',
      )
    }
    return current + 1
  }
  if (typeof config !== 'number' || !Number.isFinite(config)) {
    throw new Error(`Invalid appJson.versionCode: ${String(config)}`)
  }
  return config
}

function asAppJson(value: unknown): AppJsonLike {
  if (value === null || typeof value !== 'object') {
    throw new Error('app.json root must be a JSON object')
  }
  return value as AppJsonLike
}

async function readAppJsonFile(filePath: string): Promise<AppJsonLike | null> {
  if (!existsSync(filePath)) return null
  const raw = await readFile(filePath, 'utf-8')
  return asAppJson(JSON.parse(raw))
}

async function writeAppJsonFile(
  filePath: string,
  value: AppJsonLike,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8')
}

/**
 * 把 app.json 当前内容备份到 `<file>.bak`。
 * 若备份文件已存在则覆盖（幂等）。抛错时让上层走 release.ts 的 try/catch 流程。
 */
export async function backupAppJson(filePath: string): Promise<void> {
  if (!existsSync(filePath)) return
  const backupPath = `${filePath}.bak`
  await copyFile(filePath, backupPath)
}

/**
 * 把 app.json 还原到 .bak。失败时不抛错（兜底策略：保留 .bak 供手工恢复）。
 */
export async function restoreAppJson(filePath: string): Promise<void> {
  const backupPath = `${filePath}.bak`
  if (!existsSync(backupPath)) return
  await copyFile(backupPath, filePath)
  await rm(backupPath, { force: true })
}

/**
 * 计算 sync 后的 app.json，不写盘。供 dry-run / 测试共享。
 */
export function buildAppJsonPatch(
  appJson: AppJsonLike,
  options: {
    version: string
    config: AppJsonConfig
  },
): {
  next: AppJsonLike
  versionName: string
  versionCode: number | undefined
} {
  const { version, config } = options
  const versionName = resolveVersionName(version, config.versionNameStrategy)
  const expo = { ...(appJson.expo ?? {}) }
  expo.version = versionName

  if (config.writeIosBuildNumber) {
    const ios = { ...(expo.ios ?? {}) }
    ios.buildNumber = versionName
    expo.ios = ios
  }

  let versionCode: number | undefined
  if (config.versionCode !== undefined) {
    const android = { ...(expo.android ?? {}) }
    versionCode = resolveVersionCode(config.versionCode, android.versionCode)
    android.versionCode = versionCode
    expo.android = android
  }

  return {
    next: { ...appJson, expo },
    versionName,
    versionCode,
  }
}

/**
 * 把 version 同步到 app.json。
 *
 * 行为：
 * - enabled !== true 时直接返回（changed=false），无副作用
 * - file 不存在时直接返回（changed=false），不报错
 * - dry-run 时只计算 patch，不写盘
 * - 写入失败时回滚到 .bak
 */
export async function syncAppJsonVersion(
  options: SyncAppJsonOptions,
): Promise<SyncAppJsonResult> {
  const { cwd, config, version, dryRun = false } = options

  if (config.enabled !== true) {
    return {
      changed: false,
      appJson: null,
      filePath: resolve(cwd, config.file ?? 'app.json'),
      versionName: '',
      versionCode: undefined,
      dryRun,
    }
  }

  if (!semver.valid(version)) {
    throw new Error(`Invalid semver version for app.json sync: ${version}`)
  }

  const filePath = resolve(cwd, config.file ?? 'app.json')
  const appJson = await readAppJsonFile(filePath)

  if (appJson === null) {
    return {
      changed: false,
      appJson: null,
      filePath,
      versionName: '',
      versionCode: undefined,
      dryRun,
    }
  }

  const patch = buildAppJsonPatch(appJson, { version, config })

  if (dryRun) {
    return {
      changed: false,
      appJson: patch.next,
      filePath,
      versionName: patch.versionName,
      versionCode: patch.versionCode,
      dryRun: true,
    }
  }

  await backupAppJson(filePath)
  try {
    await writeAppJsonFile(filePath, patch.next)
  } catch (error) {
    await restoreAppJson(filePath).catch(() => {})
    throw error
  }

  recordAppJsonWrite(filePath)

  return {
    changed: true,
    appJson: patch.next,
    filePath,
    versionName: patch.versionName,
    versionCode: patch.versionCode,
    dryRun: false,
  }
}

/**
 * versionPackages 内部调用。封装一下便于单测注入。
 */
export async function runAppJsonSyncFromConfig(
  config: ReleaseConfig,
  version: string,
  dryRun: boolean,
): Promise<SyncAppJsonResult> {
  if (!config.appJson) {
    return {
      changed: false,
      appJson: null,
      filePath: '',
      versionName: '',
      versionCode: undefined,
      dryRun,
    }
  }
  return syncAppJsonVersion({
    cwd: config.cwd ?? process.cwd(),
    config: config.appJson,
    version,
    dryRun,
  })
}

/**
 * 老 release() API 用的 rollback 记录。
 * 用于在 release.ts 里追踪本次 session 改动过的 app.json 路径，
 * 出错时统一回滚。
 */
interface AppJsonRecord {
  filePath: string
}

const appJsonRecord: AppJsonRecord[] = []

/**
 * 由调用方告知 syncAppJsonVersion 实际写过的文件路径，
 * 以便出错时统一回滚。本函数幂等：同一 filePath 只记一次。
 */
export function recordAppJsonWrite(filePath: string): void {
  if (!appJsonRecord.some(r => r.filePath === filePath)) {
    appJsonRecord.push({ filePath })
  }
}

export async function rollbackAppJsonRecord(): Promise<void> {
  for (const record of appJsonRecord) {
    await restoreAppJson(record.filePath).catch(() => {})
  }
}

export function clearAppJsonRecord(): void {
  appJsonRecord.length = 0
}
