import { describe, expect, it } from 'vitest'
import {
  DEPENDENCY_FIELDS,
  PRESETS,
  REQUIRED_FIELDS,
  STANDARD_FIELDS_ORDER,
  VALID_LICENSES,
} from '../src/constants'

describe('constants', () => {
  describe('REQUIRED_FIELDS', () => {
    it('应该包含必需的字段', () => {
      expect(REQUIRED_FIELDS).toContain('name')
      expect(REQUIRED_FIELDS).toContain('version')
    })

    it('应该只有两个必需字段', () => {
      expect(REQUIRED_FIELDS).toHaveLength(2)
    })
  })

  describe('DEPENDENCY_FIELDS', () => {
    it('应该包含所有依赖字段', () => {
      expect(DEPENDENCY_FIELDS).toContain('dependencies')
      expect(DEPENDENCY_FIELDS).toContain('devDependencies')
      expect(DEPENDENCY_FIELDS).toContain('peerDependencies')
      expect(DEPENDENCY_FIELDS).toContain('optionalDependencies')
    })

    it('应该有4个依赖字段', () => {
      expect(DEPENDENCY_FIELDS).toHaveLength(4)
    })
  })

  describe('STANDARD_FIELDS_ORDER', () => {
    it('应该按正确顺序排列字段', () => {
      expect(STANDARD_FIELDS_ORDER[0]).toBe('name')
      expect(STANDARD_FIELDS_ORDER[1]).toBe('private')
      expect(STANDARD_FIELDS_ORDER[2]).toBe('version')
    })

    it('应该包含所有关键字段', () => {
      expect(STANDARD_FIELDS_ORDER).toContain('name')
      expect(STANDARD_FIELDS_ORDER).toContain('version')
      expect(STANDARD_FIELDS_ORDER).toContain('scripts')
      expect(STANDARD_FIELDS_ORDER).toContain('dependencies')
      expect(STANDARD_FIELDS_ORDER).toContain('devDependencies')
    })

    it('应该包含最后一个字段', () => {
      expect(STANDARD_FIELDS_ORDER[STANDARD_FIELDS_ORDER.length - 1]).toBe(
        'workspaces',
      )
    })
  })

  describe('VALID_LICENSES', () => {
    it('应该包含常用许可证', () => {
      expect(VALID_LICENSES).toContain('MIT')
      expect(VALID_LICENSES).toContain('Apache-2.0')
      expect(VALID_LICENSES).toContain('ISC')
      expect(VALID_LICENSES).toContain('BSD-3-Clause')
    })

    it('应该包含开源许可证', () => {
      expect(VALID_LICENSES).toContain('GPL-3.0')
      expect(VALID_LICENSES).toContain('LGPL-3.0')
    })
  })

  describe('PRESETS', () => {
    it('应该包含 basic 预设', () => {
      expect(PRESETS.basic).toBeDefined()
      expect(PRESETS.basic.scripts).toBeDefined()
      expect(PRESETS.basic.private).toBe(true)
    })

    it('应该包含 library 预设', () => {
      expect(PRESETS.library).toBeDefined()
      expect(PRESETS.library.main).toBeDefined()
      expect(PRESETS.library.types).toBeDefined()
    })

    it('basic 预设应该有正确的 scripts', () => {
      const scripts = PRESETS.basic.scripts
      expect(scripts.dev).toBeDefined()
      expect(scripts.build).toBeDefined()
      expect(scripts.test).toBeDefined()
    })

    it('basic 预设应该有正确的 devDependencies', () => {
      const devDeps = PRESETS.basic.devDependencies
      expect(devDeps.typescript).toBeDefined()
      expect(devDeps.vitest).toBeDefined()
    })
  })
})
