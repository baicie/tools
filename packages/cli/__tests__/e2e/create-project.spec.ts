import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { execa } from 'execa'
import fs from 'fs-extra'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { templateRoot } from '../../src/util'

const CLI_PATH = fileURLToPath(new URL('../../cli.js', import.meta.url))

describe('CLI E2E - project creation', () => {
  const testDir = path.join(tmpdir(), `baicie-cli-e2e-${process.pid}`)
  const sourceDirectory = path.join(testDir, 'fixture-source')
  const sourceRemote = path.join(testDir, 'fixture-source.git')
  let templateSource: string

  beforeAll(async () => {
    await fs.ensureDir(path.join(sourceDirectory, 'fixture-template', 'src'))
    await fs.writeJson(
      path.join(sourceDirectory, 'fixture-template', 'package.json'),
      {
        name: 'fixture-template',
        version: '1.0.0',
        description: 'Fixture template',
      },
      { spaces: 2 },
    )
    await fs.writeFile(
      path.join(sourceDirectory, 'fixture-template', 'src', 'index.ts'),
      'export const fixture = true\n',
    )

    await execa('git', ['init', '--initial-branch=main'], {
      cwd: sourceDirectory,
    })
    await execa('git', ['config', 'user.email', 'tests@example.com'], {
      cwd: sourceDirectory,
    })
    await execa('git', ['config', 'user.name', 'CLI tests'], {
      cwd: sourceDirectory,
    })
    await execa('git', ['add', '.'], { cwd: sourceDirectory })
    await execa('git', ['commit', '-m', 'fixture'], { cwd: sourceDirectory })
    await execa('git', ['clone', '--bare', sourceDirectory, sourceRemote])
    templateSource = pathToFileURL(sourceRemote).href
  })

  beforeEach(async () => {
    await fs.emptyDir(templateRoot)
  })

  afterAll(async () => {
    await fs.remove(testDir)
    await fs.emptyDir(templateRoot)
  })

  async function createProject(
    projectName: string,
    options: { gitInit?: boolean; gitRemote?: string } = {},
  ) {
    const args = [
      CLI_PATH,
      projectName,
      '--description',
      'Created by an end-to-end test',
      '--npm',
      'pnpm',
      '--template-source',
      templateSource,
      '--template',
      'fixture-template',
      '--lang',
      'en-US',
    ]

    if (options.gitInit) {
      args.push('--git-init')
    }
    if (options.gitRemote) {
      args.push('--git-remote', options.gitRemote)
    }

    return execa('node', args, {
      cwd: testDir,
      env: { ...process.env, CI: 'true' },
      reject: false,
    })
  }

  it('creates a project non-interactively from a local Git template', async () => {
    const projectName = 'created-project'
    const projectPath = path.join(testDir, projectName)
    const result = await createProject(projectName)

    expect(result.exitCode).toBe(0)
    expect(await fs.pathExists(path.join(projectPath, 'src', 'index.ts'))).toBe(
      true,
    )

    const pkg = await fs.readJson(path.join(projectPath, 'package.json'))
    expect(pkg.name).toBe(projectName)
    expect(pkg.description).toBe('Created by an end-to-end test')
    expect(await fs.pathExists(path.join(projectPath, 'node_modules'))).toBe(
      false,
    )
  }, 30000)

  it('waits for Git initialization and configures the supplied remote', async () => {
    const projectName = 'git-project'
    const projectPath = path.join(testDir, projectName)
    const result = await createProject(projectName, {
      gitInit: true,
      gitRemote: templateSource,
    })

    expect(result.exitCode).toBe(0)
    expect(await fs.pathExists(path.join(projectPath, '.git'))).toBe(true)

    const remote = await execa('git', ['remote', 'get-url', 'origin'], {
      cwd: projectPath,
    })
    expect(remote.stdout).toBe(templateSource)
  }, 30000)
})
