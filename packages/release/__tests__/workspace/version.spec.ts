import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type {
  PackageJsonLike,
  ReleaseConfig,
  ReleasePackage,
} from '../../src/workspace/types'
import {
  normalizePackageJson,
  versionPackages,
} from '../../src/workspace/version'

function createTempDir(): string {
  const dir = join(tmpdir(), 'release-test-version-' + Date.now())
  mkdirSync(dir, { recursive: true })
  return dir
}

const BASE_PACKAGE_JSON: PackageJsonLike = {
  name: '@zeus-js/core',
  version: '1.0.0',
  description: 'Core package',
  license: 'MIT',
  type: 'module',
}

const BASE_RELEASE_PACKAGE: ReleasePackage = {
  name: '@zeus-js/core',
  version: '1.0.0',
  dir: '/root/packages/core',
  relativeDir: 'packages/core',
  packageJsonPath: '/root/packages/core/package.json',
  packageJson: BASE_PACKAGE_JSON,
  isPrivate: false,
}

const BASE_CONFIG: ReleaseConfig = {
  repo: 'baicie/example',
  repositoryUrl: 'https://github.com/baicie/example.git',
  mode: 'workspace-fixed',
  workspace: {
    roots: ['packages'],
  },
  publish: {
    access: 'public',
    provenance: true,
    skipExisting: true,
    retry: 5,
  },
}

function normalize(pkg?: Partial<PackageJsonLike>): PackageJsonLike {
  return normalizePackageJson(
    { ...BASE_PACKAGE_JSON, ...pkg },
    {
      version: '2.0.0',
      releasePackage: BASE_RELEASE_PACKAGE,
      config: BASE_CONFIG,
    },
  )
}

describe('normalizePackageJson', () => {
  it('sets the version', () => {
    const result = normalize()
    expect(result.version).toBe('2.0.0')
  })

  it('adds repository field', () => {
    const result = normalize()
    expect(result.repository).toEqual({
      type: 'git',
      url: 'https://github.com/baicie/example.git',
      directory: 'packages/core',
    })
  })

  it('adds publishConfig fields', () => {
    const result = normalize()
    expect(result.publishConfig).toMatchObject({
      access: 'public',
      provenance: true,
    })
  })

  it('preserves existing publishConfig fields', () => {
    const result = normalize({
      publishConfig: {
        registry: 'https://custom.registry.com',
      },
    })
    expect(result.publishConfig).toMatchObject({
      access: 'public',
      provenance: true,
      registry: 'https://custom.registry.com',
    })
  })

  it('preserves all original fields', () => {
    const original: PackageJsonLike = {
      name: '@zeus-js/core',
      version: '1.0.0',
      description: 'Core package',
      license: 'MIT',
      type: 'module',
      sideEffects: false,
      dependencies: { react: '^18.0.0' },
    }

    const result = normalizePackageJson(original, {
      version: '2.0.0',
      releasePackage: BASE_RELEASE_PACKAGE,
      config: BASE_CONFIG,
    })

    expect(result.name).toBe('@zeus-js/core')
    expect(result.description).toBe('Core package')
    expect(result.license).toBe('MIT')
    expect(result.type).toBe('module')
    expect(result.dependencies).toEqual({ react: '^18.0.0' })
  })

  it('orders keys with preferred fields first', () => {
    const result = normalize({
      dependencies: { react: '^18.0.0' },
      scripts: { build: 'tsc' },
    })

    const keys = Object.keys(result)
    const nameIndex = keys.indexOf('name')
    const versionIndex = keys.indexOf('version')
    const scriptsIndex = keys.indexOf('scripts')
    const dependenciesIndex = keys.indexOf('dependencies')

    expect(nameIndex).toBeLessThan(versionIndex)
    expect(versionIndex).toBeLessThan(dependenciesIndex)
    expect(scriptsIndex).toBeLessThan(dependenciesIndex)
  })

  it('adds registry to publishConfig when configured', () => {
    const configWithRegistry: ReleaseConfig = {
      ...BASE_CONFIG,
      publish: {
        ...BASE_CONFIG.publish!,
        registry: 'https://custom.registry.com',
      },
    }

    const result = normalizePackageJson(BASE_PACKAGE_JSON, {
      version: '2.0.0',
      releasePackage: BASE_RELEASE_PACKAGE,
      config: configWithRegistry,
    })

    expect(result.publishConfig).toMatchObject({
      registry: 'https://custom.registry.com',
    })
  })
})

describe('versionPackages', () => {
  let dir: string

  beforeEach(() => {
    dir = createTempDir()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('applies versionPackage hook when configured', async () => {
    const pkgDir = join(dir, 'packages', 'core')
    mkdirSync(pkgDir, { recursive: true })

    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify(BASE_PACKAGE_JSON, null, 2),
    )

    const configWithHook: ReleaseConfig = {
      ...BASE_CONFIG,
      cwd: dir,
      versionPackage: (
        pkg: PackageJsonLike,
        ctx: {
          version: string
          releasePackage: ReleasePackage
          config: ReleaseConfig
        },
      ) => ({
        ...pkg,
        version: ctx.version,
        description: 'Version ' + ctx.version,
      }),
    }

    await versionPackages(configWithHook, {
      version: '3.0.0',
      dryRun: false,
    })

    const result = JSON.parse(
      readFileSync(join(pkgDir, 'package.json'), 'utf-8'),
    ) as PackageJsonLike

    expect(result.version).toBe('3.0.0')
    expect(result.description).toBe('Version 3.0.0')
  })
})
