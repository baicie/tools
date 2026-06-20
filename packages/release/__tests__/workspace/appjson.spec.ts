import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  backupAppJson,
  buildAppJsonPatch,
  restoreAppJson,
  runAppJsonSyncFromConfig,
  syncAppJsonVersion,
} from '../../src/workspace/appjson'
import type { AppJsonLike } from '../../src/workspace/appjson'
import type { ReleaseConfig } from '../../src/workspace/types'

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `release-appjson-${prefix}-`))
}

function writeJsonFile(file: string, value: unknown): void {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function readJsonFile<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf-8')) as T
}

const baseAppJson: AppJsonLike = {
  expo: {
    name: 'clash-helper',
    slug: 'clash-helper',
    version: '1.0.0',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.baicie.clashhelper',
      buildNumber: '1',
    },
    android: { package: 'com.baicie.clashhelper', versionCode: 1 },
    owner: 'baicie',
    extra: { eas: { projectId: 'p' } },
  },
}

describe('buildAppJsonPatch', () => {
  it('writes version exactly when strategy=exact', () => {
    const result = buildAppJsonPatch(baseAppJson, {
      version: '0.0.0-beta.2',
      config: { enabled: true, versionNameStrategy: 'exact' },
    })

    expect(result.versionName).toBe('0.0.0-beta.2')
    expect(result.next.expo?.version).toBe('0.0.0-beta.2')
    expect(result.versionCode).toBeUndefined()
  })

  it('strips prerelease suffix when strategy=strip-prerelease', () => {
    const result = buildAppJsonPatch(baseAppJson, {
      version: '0.0.0-beta.2',
      config: { enabled: true, versionNameStrategy: 'strip-prerelease' },
    })

    expect(result.versionName).toBe('0.0.0')
    expect(result.next.expo?.version).toBe('0.0.0')
  })

  it('leaves existing android block untouched when versionCode not configured', () => {
    const result = buildAppJsonPatch(baseAppJson, {
      version: '1.2.3',
      config: { enabled: true },
    })

    expect(result.versionCode).toBeUndefined()
    expect(result.next.expo?.android).toEqual(baseAppJson.expo?.android)
  })

  it('writes numeric versionCode when configured', () => {
    const result = buildAppJsonPatch(baseAppJson, {
      version: '1.2.3',
      config: { enabled: true, versionCode: 7 },
    })

    expect(result.versionCode).toBe(7)
    expect(result.next.expo?.android?.versionCode).toBe(7)
  })

  it('increments existing versionCode when configured as "auto"', () => {
    const result = buildAppJsonPatch(baseAppJson, {
      version: '1.2.3',
      config: { enabled: true, versionCode: 'auto' },
    })

    expect(result.versionCode).toBe(2)
    expect(result.next.expo?.android?.versionCode).toBe(2)
  })

  it('throws when versionCode="auto" but no current value exists', () => {
    const withoutAndroid: AppJsonLike = {
      expo: { name: 'x', version: '1.0.0', ios: {} },
    }

    expect(() =>
      buildAppJsonPatch(withoutAndroid, {
        version: '1.2.3',
        config: { enabled: true, versionCode: 'auto' },
      }),
    ).toThrow(/existing expo\.android\.versionCode/)
  })

  it('writes ios.buildNumber only when writeIosBuildNumber=true', () => {
    const exact = buildAppJsonPatch(baseAppJson, {
      version: '0.0.0-beta.2',
      config: { enabled: true, writeIosBuildNumber: false },
    })
    expect(exact.next.expo?.ios?.buildNumber).toBe('1')

    const updated = buildAppJsonPatch(baseAppJson, {
      version: '0.0.0-beta.2',
      config: { enabled: true, writeIosBuildNumber: true },
    })
    expect(updated.next.expo?.ios?.buildNumber).toBe('0.0.0-beta.2')
  })

  it('preserves unrelated fields like owner and extra', () => {
    const result = buildAppJsonPatch(baseAppJson, {
      version: '9.9.9',
      config: { enabled: true },
    })

    expect(result.next.expo?.owner).toBe('baicie')
    expect(result.next.expo?.extra).toEqual({ eas: { projectId: 'p' } })
    expect(result.next.expo?.slug).toBe('clash-helper')
  })

  it('creates missing expo/android blocks when versionCode is configured', () => {
    const minimal: AppJsonLike = { expo: { version: '1.0.0' } }
    const result = buildAppJsonPatch(minimal, {
      version: '1.2.3',
      config: { enabled: true, versionCode: 5 },
    })

    expect(result.next.expo?.android).toEqual({ versionCode: 5 })
    expect(result.next.expo?.version).toBe('1.2.3')
  })
})

describe('syncAppJsonVersion', () => {
  let workDir: string

  beforeEach(() => {
    workDir = makeTempDir('sync')
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  it('is a no-op when enabled is not true', async () => {
    const file = join(workDir, 'app.json')
    writeJsonFile(file, baseAppJson)

    const result = await syncAppJsonVersion({
      cwd: workDir,
      config: { enabled: false },
      version: '1.2.3',
    })

    expect(result.changed).toBe(false)
    expect(result.appJson).toBeNull()
    const onDisk = readJsonFile<AppJsonLike>(file)
    expect(onDisk.expo?.version).toBe('1.0.0')
  })

  it('is a no-op when app.json does not exist', async () => {
    const file = join(workDir, 'app.json')
    expect(() => readFileSync(file)).toThrow()

    const result = await syncAppJsonVersion({
      cwd: workDir,
      config: { enabled: true },
      version: '1.2.3',
    })

    expect(result.changed).toBe(false)
    expect(result.appJson).toBeNull()
  })

  it('writes version and creates .bak on real run', async () => {
    const file = join(workDir, 'app.json')
    writeJsonFile(file, baseAppJson)

    const result = await syncAppJsonVersion({
      cwd: workDir,
      config: { enabled: true, versionCode: 4 },
      version: '0.0.0-beta.3',
    })

    expect(result.changed).toBe(true)
    expect(result.versionName).toBe('0.0.0-beta.3')
    expect(result.versionCode).toBe(4)

    const updated = readJsonFile<AppJsonLike>(file)
    expect(updated.expo?.version).toBe('0.0.0-beta.3')
    expect(updated.expo?.android?.versionCode).toBe(4)

    const backup = readJsonFile<AppJsonLike>(`${file}.bak`)
    expect(backup).toEqual(baseAppJson)
  })

  it('does not write to disk in dry-run mode', async () => {
    const file = join(workDir, 'app.json')
    writeJsonFile(file, baseAppJson)
    const before = readFileSync(file, 'utf-8')

    const result = await syncAppJsonVersion({
      cwd: workDir,
      config: { enabled: true, versionCode: 9 },
      version: '1.2.3',
      dryRun: true,
    })

    expect(result.changed).toBe(false)
    expect(result.dryRun).toBe(true)
    expect(result.versionName).toBe('1.2.3')
    expect(result.versionCode).toBe(9)
    expect(readFileSync(file, 'utf-8')).toBe(before)
    expect(() => readFileSync(`${file}.bak`)).toThrow()
  })

  it('throws on invalid semver version', async () => {
    const file = join(workDir, 'app.json')
    writeJsonFile(file, baseAppJson)

    await expect(
      syncAppJsonVersion({
        cwd: workDir,
        config: { enabled: true },
        version: 'not-a-version',
      }),
    ).rejects.toThrow(/Invalid semver/)
  })

  it('uses custom file path when configured', async () => {
    const customDir = join(workDir, 'config')
    mkdirSync(customDir, { recursive: true })
    const customFile = join(customDir, 'expo-app.json')
    writeJsonFile(customFile, baseAppJson)

    const result = await syncAppJsonVersion({
      cwd: workDir,
      config: { enabled: true, file: 'config/expo-app.json' },
      version: '2.0.0',
    })

    expect(result.changed).toBe(true)
    expect(result.filePath).toBe(customFile)
    const updated = readJsonFile<AppJsonLike>(customFile)
    expect(updated.expo?.version).toBe('2.0.0')
  })

  it('records writes for rollback via restoreAppJson', async () => {
    const file = join(workDir, 'app.json')
    writeJsonFile(file, baseAppJson)
    await backupAppJson(file)

    const original = readJsonFile<AppJsonLike>(file)

    // 模拟 sync 写盘成功后出错场景：人为修改文件，然后 restoreAppJson 还原
    writeJsonFile(file, { expo: { version: 'broken' } })
    await restoreAppJson(file)

    const after = readJsonFile<AppJsonLike>(file)
    expect(after).toEqual(original)
    expect(() => readFileSync(`${file}.bak`)).toThrow()
  })
})

describe('backupAppJson + restoreAppJson', () => {
  let workDir: string

  beforeEach(() => {
    workDir = makeTempDir('bak')
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  it('copies file to .bak', async () => {
    const file = join(workDir, 'app.json')
    writeJsonFile(file, baseAppJson)

    await backupAppJson(file)

    const backup = readJsonFile<AppJsonLike>(`${file}.bak`)
    expect(backup).toEqual(baseAppJson)
  })

  it('does nothing when source file does not exist', async () => {
    const file = join(workDir, 'app.json')

    await backupAppJson(file)

    expect(() => readFileSync(`${file}.bak`)).toThrow()
  })

  it('restores file from .bak and removes the backup', async () => {
    const file = join(workDir, 'app.json')
    writeJsonFile(file, baseAppJson)
    await backupAppJson(file)

    writeJsonFile(file, { expo: { version: 'changed' } })

    await restoreAppJson(file)

    const restored = readJsonFile<AppJsonLike>(file)
    expect(restored).toEqual(baseAppJson)
    expect(() => readFileSync(`${file}.bak`)).toThrow()
  })

  it('is idempotent: second backup overwrites the first', async () => {
    const file = join(workDir, 'app.json')
    writeJsonFile(file, baseAppJson)
    await backupAppJson(file)

    const modified = { expo: { version: 'x' } }
    writeJsonFile(file, modified)
    await backupAppJson(file)

    const backup = readJsonFile<AppJsonLike>(`${file}.bak`)
    expect(backup).toEqual(modified)
  })
})

describe('runAppJsonSyncFromConfig', () => {
  let workDir: string

  beforeEach(() => {
    workDir = makeTempDir('cfg')
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  it('skips when config.appJson is undefined', async () => {
    const file = join(workDir, 'app.json')
    writeJsonFile(file, baseAppJson)

    const config: ReleaseConfig = {
      repo: 'r',
      repositoryUrl: 'https://x/y',
      mode: 'workspace-fixed',
      cwd: workDir,
      workspace: { roots: ['nope'] },
    }

    const result = await runAppJsonSyncFromConfig(config, '1.2.3', false)
    expect(result.changed).toBe(false)
    expect(readJsonFile<AppJsonLike>(file).expo?.version).toBe('1.0.0')
  })

  it('uses process.cwd() when config.cwd is undefined', async () => {
    const config: ReleaseConfig = {
      repo: 'r',
      repositoryUrl: 'https://x/y',
      mode: 'workspace-fixed',
      workspace: { roots: ['nope'] },
      appJson: { enabled: true },
    }

    // 不会真正改动仓库的 app.json——先读后写回到原值以做对比
    // 仅做断言：返回结果可访问，filePath 使用 process.cwd()
    const result = await runAppJsonSyncFromConfig(config, '0.0.0-test', true)
    expect(result.dryRun).toBe(true)
    expect(result.filePath).toContain('app.json')
  })
})
