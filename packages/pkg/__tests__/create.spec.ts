import { describe, expect, it } from 'vitest'
import {
  clonePackageJson,
  createByProjectType,
  createMinimalPackageJson,
  createPackageJson,
  createPackageJsonString,
} from '../src/create'

describe('createPackageJson', () => {
  it('应该创建基本的 package.json', () => {
    const pkg = createPackageJson({
      name: 'test-package',
      version: '1.0.0',
    })

    expect(pkg.name).toBe('test-package')
    expect(pkg.version).toBe('1.0.0')
  })

  it('应该使用默认值', () => {
    const pkg = createPackageJson()

    expect(pkg.version).toBe('0.1.0')
    expect(pkg.license).toBe('MIT')
  })

  it('应该支持不同的预设模板', () => {
    const basic = createPackageJson({ preset: 'basic' })
    const library = createPackageJson({ preset: 'library' })
    const cli = createPackageJson({ preset: 'cli' })

    expect(basic).toBeDefined()
    expect(library).toBeDefined()
    expect(cli).toBeDefined()
  })

  it('应该支持自定义字段', () => {
    const pkg = createPackageJson({
      name: 'test',
      description: 'Test description',
      author: 'Test Author',
      private: true,
      type: 'module',
    })

    expect(pkg.description).toBe('Test description')
    expect(pkg.author).toBe('Test Author')
    expect(pkg.private).toBe(true)
    expect(pkg.type).toBe('module')
  })

  it('应该使用预设的默认值', () => {
    const pkg = createPackageJson({ name: 'test' })
    expect(pkg.version).toBe('0.1.0')
    expect(pkg.license).toBe('MIT')
  })
})

describe('createPackageJsonString', () => {
  it('应该创建格式化的 JSON 字符串', () => {
    const jsonString = createPackageJsonString({
      name: 'test-package',
      version: '1.0.0',
    })

    expect(jsonString).toContain('"name": "test-package"')
    expect(jsonString).toContain('"version": "1.0.0"')
    expect(jsonString.endsWith('\n')).toBe(true)
  })

  it('应该支持自定义缩进', () => {
    const jsonString = createPackageJsonString(
      {
        name: 'test',
      },
      4,
    )

    const lines = jsonString.split('\n')
    expect(lines[1]).toMatch(/^    "/)
  })
})

describe('clonePackageJson', () => {
  it('应该克隆 package.json 并支持覆盖', () => {
    const base = createPackageJson({
      name: 'base',
      version: '1.0.0',
    })

    const cloned = clonePackageJson(base, {
      version: '2.0.0',
      description: 'Updated',
    })

    expect(cloned.name).toBe('base')
    expect(cloned.version).toBe('2.0.0')
    expect(cloned.description).toBe('Updated')
    expect(base.version).toBe('1.0.0')
  })

  it('应该深度克隆对象', () => {
    const base = createPackageJson({
      name: 'base',
    })
    base.dependencies = { react: '^18.0.0' }

    const cloned = clonePackageJson(base, {})
    cloned.dependencies!.vue = '^3.0.0'

    expect(base.dependencies!.vue).toBeUndefined()
  })
})

describe('createMinimalPackageJson', () => {
  it('应该创建最小化的 package.json', () => {
    const pkg = createMinimalPackageJson('minimal-pkg', '0.0.1')

    expect(pkg.name).toBe('minimal-pkg')
    expect(pkg.version).toBe('0.0.1')
    expect(Object.keys(pkg).length).toBeLessThan(5)
  })

  it('应该创建无名包的最小化 package.json', () => {
    const pkg = createMinimalPackageJson()
    expect(pkg.name).toBeUndefined()
    expect(pkg.version).toBe('0.1.0')
  })
})

describe('createByProjectType', () => {
  it('应该为 library 类型创建 package.json', () => {
    const pkg = createByProjectType('library', 'my-lib')
    expect(pkg.name).toBe('my-lib')
    expect(pkg.main).toBeDefined()
  })

  it('应该为 cli 类型创建 package.json', () => {
    const pkg = createByProjectType('cli', 'my-cli')
    expect(pkg.name).toBe('my-cli')
  })

  it('应该为 app 类型创建 package.json', () => {
    const pkg = createByProjectType('app', 'my-app')
    expect(pkg.name).toBe('my-app')
  })

  it('应该为 monorepo 类型创建 package.json', () => {
    const pkg = createByProjectType('monorepo', 'my-monorepo')
    expect(pkg.name).toBe('my-monorepo')
  })

  it('应该支持不指定名称', () => {
    const pkg = createByProjectType('library')
    expect(pkg.name).toBe('')
  })
})
