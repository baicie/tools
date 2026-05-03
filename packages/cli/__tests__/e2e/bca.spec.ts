import path from 'node:path'
import type { SyncOptions } from 'execa'
import { execaCommandSync } from 'execa'
import { describe, expect, it } from 'vitest'

const CLI_PATH = path.join(__dirname, '../../cli.js')

const run = (args: string[], options?: SyncOptions) => {
  return execaCommandSync(`node ${CLI_PATH} ${args.join(' ')}`, {
    env: { ...process.env },
    ...options,
  })
}

describe('CLI 命令 (E2E)', () => {
  it('应该提示输入项目名称', () => {
    const { stdout } = run([])
    expect(stdout).toContain('项目名称?')
  })

  it('应该提示输入项目描述', () => {
    const { stdout } = run(['test-app'])
    expect(stdout).toContain('请输入项目介绍')
  })

  it('应该支持 --help 选项', () => {
    const { stdout } = run(['--help'])
    expect(stdout).toContain('Usage')
  })

  it('应该支持 --version 选项', () => {
    const { stdout } = run(['--version'])
    expect(stdout).toMatch(/\d+\.\d+\.\d+/)
  })

  it('应该支持 pkg 子命令', () => {
    const { stdout } = run(['pkg', '--help'])
    expect(stdout).toContain('package.json')
  })
})
