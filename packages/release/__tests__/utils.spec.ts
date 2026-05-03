import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  backupVersion,
  clearBackups,
  getPackageInfo,
  getVersionChoices,
  rollbackVersion,
  step,
  updateVersion,
  versionBackups,
} from '../src/utils'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'

describe('getPackageInfo', () => {
  it('应该读取package.json信息', () => {
    const tempDir = tmpdir()
    const pkgPath = path.join(tempDir, 'package.json')
    const pkgData = {
      name: 'test-package',
      version: '1.0.0',
    }

    writeFileSync(pkgPath, JSON.stringify(pkgData))

    const info = getPackageInfo('test-package', () => tempDir)

    expect(info.pkg.name).toBe('test-package')
    expect(info.pkg.version).toBe('1.0.0')
    expect(info.pkgDir).toBe(tempDir)
    expect(info.pkgPath).toBe(pkgPath)
  })

  it('应该在包为私有时抛出错误', () => {
    const tempDir = tmpdir()
    const pkgPath = path.join(tempDir, 'package.json')
    const pkgData = {
      name: 'test-package',
      version: '1.0.0',
      private: true,
    }

    writeFileSync(pkgPath, JSON.stringify(pkgData))

    expect(() => {
      getPackageInfo('test-package', () => tempDir)
    }).toThrow()
  })

  it('应该返回完整路径信息', () => {
    const tempDir = tmpdir()
    const pkgPath = path.join(tempDir, 'package.json')
    const pkgData = {
      name: 'test-package',
      version: '1.0.0',
    }

    writeFileSync(pkgPath, JSON.stringify(pkgData))

    const info = getPackageInfo('test-package', () => tempDir)

    expect(info.pkgDir).toBe(tempDir)
    expect(info.pkgPath).toBe(pkgPath)
  })
})

describe('updateVersion', () => {
  it('应该更新版本号', () => {
    const tempDir = tmpdir()
    const pkgPath = path.join(tempDir, 'package.json')
    const pkgData = {
      name: 'test-package',
      version: '1.0.0',
    }

    writeFileSync(pkgPath, JSON.stringify(pkgData))

    updateVersion(pkgPath, '2.0.0')

    const updated = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    expect(updated.version).toBe('2.0.0')
  })

  it('应该保留其他字段', () => {
    const tempDir = tmpdir()
    const pkgPath = path.join(tempDir, 'package.json')
    const pkgData = {
      name: 'test-package',
      version: '1.0.0',
      description: 'Test package',
      dependencies: {},
    }

    writeFileSync(pkgPath, JSON.stringify(pkgData))

    updateVersion(pkgPath, '3.0.0')

    const updated = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    expect(updated.version).toBe('3.0.0')
    expect(updated.name).toBe('test-package')
    expect(updated.description).toBe('Test package')
  })
})

describe('getVersionChoices', () => {
  it('稳定版本应该有 next、beta-minor、beta-major 等选项', () => {
    const choices = getVersionChoices('1.0.0')

    expect(choices.length).toBeGreaterThan(1)
    expect(choices.some(c => c.title.includes('next'))).toBe(true)
    expect(choices.some(c => c.title.includes('beta-minor'))).toBe(true)
    expect(choices.some(c => c.title.includes('major'))).toBe(true)
    expect(choices.some(c => c.title.includes('minor'))).toBe(true)
    expect(choices.some(c => c.value === 'custom')).toBe(true)
  })

  it('beta 版本应该有 stable 选项', () => {
    const choices = getVersionChoices('1.0.0-beta.1')

    expect(choices.some(c => c.title.includes('stable'))).toBe(true)
  })

  it('alpha 版本应该有 beta 选项', () => {
    const choices = getVersionChoices('1.0.0-alpha.1')

    expect(choices.some(c => c.title.includes('beta'))).toBe(true)
  })

  it('每个选项应该有 title 和 value', () => {
    const choices = getVersionChoices('1.0.0')

    choices.forEach(choice => {
      expect(choice).toHaveProperty('title')
      expect(choice).toHaveProperty('value')
      expect(choice.title).toContain(choice.value)
    })
  })

  it('版本号格式应该正确', () => {
    const choices = getVersionChoices('1.0.0')

    choices.forEach(choice => {
      if (choice.value !== 'custom') {
        expect(choice.value).toMatch(/^\d+\.\d+\.\d+/)
      }
    })
  })
})

describe('versionBackups', () => {
  beforeEach(() => {
    clearBackups()
  })

  afterEach(() => {
    clearBackups()
  })

  it('backupVersion 应该添加备份', () => {
    backupVersion('/path/to/pkg1', '1.0.0', '1.1.0')
    backupVersion('/path/to/pkg2', '2.0.0', '2.1.0')

    expect(versionBackups).toHaveLength(2)
    expect(versionBackups[0].pkgPath).toBe('/path/to/pkg1')
    expect(versionBackups[0].originalVersion).toBe('1.0.0')
    expect(versionBackups[0].updatedVersion).toBe('1.1.0')
  })

  it('clearBackups 应该清空备份', () => {
    backupVersion('/path/to/pkg1', '1.0.0', '1.1.0')
    clearBackups()

    expect(versionBackups).toHaveLength(0)
  })

  it('rollbackVersion 应该恢复版本并清空备份', () => {
    const tempDir = tmpdir()
    const pkgPath = path.join(tempDir, 'package.json')
    const pkgData = { name: 'test', version: '1.0.0' }

    writeFileSync(pkgPath, JSON.stringify(pkgData))

    backupVersion(pkgPath, '1.0.0', '2.0.0')
    updateVersion(pkgPath, '2.0.0')

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    rollbackVersion()

    const restored = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    expect(restored.version).toBe('1.0.0')
    expect(versionBackups).toHaveLength(0)

    consoleSpy.mockRestore()
  })
})

describe('step', () => {
  it('应该打印带颜色的消息', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    step('Test step message')

    expect(consoleSpy).toHaveBeenCalled()
    const allCalls = consoleSpy.mock.calls.map(c => c[0]).join('')
    expect(allCalls).toContain('Test step message')

    consoleSpy.mockRestore()
  })
})
