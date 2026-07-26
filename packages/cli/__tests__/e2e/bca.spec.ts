import path from 'node:path'
import { tmpdir } from 'node:os'
import type { SyncOptions } from 'execa'
import { execa, execaCommandSync } from 'execa'
import fs from 'fs-extra'
import { afterEach, describe, expect, it } from 'vitest'

const CLI_PATH = path.join(__dirname, '../../cli.js')
const createdDirectories: string[] = []

function run(args: string[], options?: SyncOptions) {
  return execaCommandSync(`node ${CLI_PATH} ${args.join(' ')}`, {
    env: { ...process.env, CI: 'true' },
    ...options,
  })
}

afterEach(async () => {
  await Promise.all(
    createdDirectories.splice(0).map(directory => fs.remove(directory)),
  )
})

describe('CLI commands', () => {
  it('supports --help', () => {
    const { stdout } = run(['--help'])
    expect(stdout).toContain('Usage')
  })

  it('supports --version', () => {
    const { stdout } = run(['--version'])
    expect(stdout).toMatch(/\d+\.\d+\.\d+/)
  })

  it('supports the pkg subcommand help', () => {
    const { stdout } = run(['pkg', '--help'])
    expect(stdout).toContain('package.json')
  })

  it('initializes project docs through the CLI', async () => {
    const directory = await fs.mkdtemp(
      path.join(tmpdir(), 'baicie-cli-docs-e2e-'),
    )
    createdDirectories.push(directory)

    const result = await execa(
      'node',
      [CLI_PATH, 'docs', 'init', '--root', 'docs/project'],
      {
        cwd: directory,
        env: { ...process.env, CI: 'true' },
        reject: false,
      },
    )

    expect(result.exitCode).toBe(0)
    expect(
      await fs.pathExists(path.join(directory, 'docs/project/manifest.json')),
    ).toBe(true)
  })
})
