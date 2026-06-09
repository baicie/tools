import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type {
  PackageJsonLike,
  ReleaseConfig,
  ReleasePackage,
} from '../../src/workspace/types'
import { checkReleaseReadiness } from '../../src/workspace/readiness'

function createTempDir(): string {
  const dir = join(tmpdir(), 'release-test-readiness-' + Date.now())
  mkdirSync(dir, { recursive: true })
  return dir
}

function writePackage(
  dir: string,
  relativePath: string,
  pkg: PackageJsonLike,
): string {
  const pkgDir = join(dir, relativePath)
  mkdirSync(pkgDir, { recursive: true })
  writeFileSync(join(pkgDir, 'package.json'), JSON.stringify(pkg, null, 2))

  const distDir = join(pkgDir, 'dist')
  mkdirSync(distDir, { recursive: true })

  return pkgDir
}

function makePackage(overrides?: Partial<PackageJsonLike>): PackageJsonLike {
  return {
    name: '@zeus-js/core',
    version: '1.0.0',
    description: 'Core package',
    license: 'MIT',
    exports: { '.': './dist/index.js' },
    files: ['dist'],
    scripts: {
      build: 'tsc',
      check: 'tsc --noEmit',
    },
    repository: {
      type: 'git',
      url: 'https://github.com/baicie/example.git',
      directory: 'packages/core',
    },
    publishConfig: {
      access: 'public',
      provenance: true,
    },
    ...overrides,
  }
}

function mockPackages(
  config: ReleaseConfig,
  pkgs: PackageJsonLike[],
): ReleaseConfig {
  return {
    ...config,
    workspace: {
      ...config.workspace,
      publishable: (pkg: ReleasePackage) =>
        pkgs.some(p => p.name === pkg.name && !p.private),
    },
  }
}

describe('checkReleaseReadiness', () => {
  let dir: string

  beforeEach(() => {
    dir = createTempDir()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  function makeConfig(overrides?: Partial<ReleaseConfig>): ReleaseConfig {
    return {
      repo: 'baicie/example',
      repositoryUrl: 'https://github.com/baicie/example.git',
      mode: 'workspace-fixed',
      cwd: dir,
      workspace: {
        roots: ['packages'],
      },
      ...overrides,
    }
  }

  it('returns valid for a well-configured package', () => {
    const pkg = makePackage()
    writePackage(dir, 'packages/core', pkg)
    const config = mockPackages(makeConfig(), [pkg])
    const result = checkReleaseReadiness(config)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('reports error when no publishable packages found', () => {
    const config = makeConfig()
    const result = checkReleaseReadiness(config)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('No publishable packages found.')
  })

  it('reports error when description is missing', () => {
    const pkg = makePackage({ description: undefined })
    writePackage(dir, 'packages/core', pkg)
    const config = mockPackages(makeConfig(), [pkg])
    const result = checkReleaseReadiness(config)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('description'))).toBe(true)
  })

  it('reports error when license is missing', () => {
    const pkg = makePackage({ license: undefined })
    writePackage(dir, 'packages/core', pkg)
    const config = mockPackages(makeConfig(), [pkg])
    const result = checkReleaseReadiness(config)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('license'))).toBe(true)
  })

  it('reports error when exports is missing', () => {
    const pkg = makePackage({ exports: undefined })
    writePackage(dir, 'packages/core', pkg)
    const config = mockPackages(makeConfig(), [pkg])
    const result = checkReleaseReadiness(config)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('exports'))).toBe(true)
  })

  it('reports error when build script is missing', () => {
    const pkg = makePackage({
      scripts: { check: 'tsc --noEmit' },
    })
    writePackage(dir, 'packages/core', pkg)
    const config = mockPackages(makeConfig(), [pkg])
    const result = checkReleaseReadiness(config)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('scripts.build'))).toBe(true)
  })

  it('reports error when files does not include dist', () => {
    const pkg = makePackage({ files: ['src'] })
    writePackage(dir, 'packages/core', pkg)
    const config = mockPackages(makeConfig(), [pkg])
    const result = checkReleaseReadiness(config)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('files'))).toBe(true)
  })

  it('returns valid when check or typecheck script exists', () => {
    const pkg = makePackage({
      scripts: { build: 'tsc', typecheck: 'tsc --noEmit' },
    })
    writePackage(dir, 'packages/core', pkg)
    const config = mockPackages(makeConfig(), [pkg])
    const result = checkReleaseReadiness(config)

    expect(result.valid).toBe(true)
  })

  it('reports error when check and typecheck are both missing', () => {
    const pkg = makePackage({
      scripts: { build: 'tsc' },
    })
    writePackage(dir, 'packages/core', pkg)
    const config = mockPackages(makeConfig(), [pkg])
    const result = checkReleaseReadiness(config)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('typecheck'))).toBe(true)
  })

  it('does not report 0.0.0 error with allowZero', () => {
    const pkg = makePackage({
      version: '0.0.0',
      files: ['dist'],
      scripts: { build: 'tsc', check: 'tsc --noEmit' },
    })
    writePackage(dir, 'packages/core', pkg)
    const config = mockPackages(
      makeConfig({ readiness: { allowZero: true } }),
      [pkg],
    )
    const result = checkReleaseReadiness(config)

    expect(result.errors.some(e => e.includes('0.0.0'))).toBe(false)
  })

  it('reports error for 0.0.0 version when allowZero is false', () => {
    const pkg = makePackage({ version: '0.0.0' })
    writePackage(dir, 'packages/core', pkg)
    const config = mockPackages(makeConfig(), [pkg])
    const result = checkReleaseReadiness(config)

    expect(result.errors.some(e => e.includes('0.0.0'))).toBe(true)
  })

  it('checks repository and publishConfig in strict mode', () => {
    const pkg = makePackage({
      repository: {
        type: 'git',
        url: 'https://other.com/repo.git',
        directory: 'packages/other',
      },
      publishConfig: { access: 'restricted' as const },
    })
    writePackage(dir, 'packages/core', pkg)
    const config = mockPackages(makeConfig({ readiness: { strict: true } }), [
      pkg,
    ])
    const result = checkReleaseReadiness(config)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('repository'))).toBe(true)
    expect(result.errors.some(e => e.includes('publishConfig'))).toBe(true)
  })

  it('runs custom package readiness checks', () => {
    const pkg = makePackage()
    writePackage(dir, 'packages/core', pkg)
    const config = mockPackages(
      makeConfig({
        readiness: {
          package: (p: ReleasePackage) =>
            p.name === '@zeus-js/core' ? ['Custom check failed'] : [],
        },
      }),
      [pkg],
    )
    const result = checkReleaseReadiness(config)

    expect(result.errors).toContain('Custom check failed')
  })
})
