import { describe, expect, it, vi } from 'vitest'
import { run } from '../../src/workspace/exec'

describe('run', () => {
  it('redacts sensitive values from command logs', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await run('echo', ['secret-token'], {
      dryRun: true,
      mask: ['secret-token'],
    })

    const output = spy.mock.calls.map(c => c[0]).join('\n')
    expect(output).not.toContain('secret-token')
    expect(output).toContain('***')

    spy.mockRestore()
  })

  it('uses custom label when provided', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await run('curl', ['-H', 'Authorization: Bearer my-secret-token'], {
      dryRun: true,
      label: 'curl https://api.github.com/...',
      mask: ['my-secret-token'],
    })

    const output = spy.mock.calls.map(c => c[0]).join('\n')
    expect(output).toContain('curl https://api.github.com/...')
    expect(output).not.toContain('my-secret-token')
    expect(output).toContain('***')

    spy.mockRestore()
  })

  it('handles multiple mask values', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await run(
      'curl',
      ['-H', 'Authorization: Bearer token1', '-H', 'X-Custom: token2'],
      {
        dryRun: true,
        mask: ['token1', 'token2'],
      },
    )

    const output = spy.mock.calls.map(c => c[0]).join('\n')
    expect(output).not.toContain('token1')
    expect(output).not.toContain('token2')
    expect(output).toContain('***')

    spy.mockRestore()
  })
})
