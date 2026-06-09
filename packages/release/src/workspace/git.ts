import colors from 'picocolors'

import { run } from './exec'

export async function gitStatus(cwd?: string): Promise<string> {
  const result = await run('git', ['status', '--porcelain'], {
    cwd,
    stdio: 'pipe',
  })

  return result.stdout.trim()
}

export async function assertCleanGit(cwd?: string): Promise<void> {
  const status = await gitStatus(cwd)

  if (status) {
    throw new Error(
      'Git working tree is not clean. Commit or stash changes before release.',
    )
  }
}

export async function tagExists(tag: string, cwd?: string): Promise<boolean> {
  const result = await run('git', ['tag', '-l', tag], {
    cwd,
    stdio: 'pipe',
    reject: false,
  })

  return result.stdout.trim() === tag
}

export async function commitAndTag(params: {
  version: string
  dryRun: boolean
  skipGit: boolean
  cwd?: string
}): Promise<void> {
  if (params.skipGit) {
    console.log(colors.yellow('skipGit enabled; not committing or tagging.'))
    return
  }

  const status = await gitStatus(params.cwd)
  const tag = `v${params.version}`

  if (status) {
    await run('git', ['add', '-A'], {
      cwd: params.cwd,
      dryRun: params.dryRun,
    })

    await run('git', ['commit', '-m', `release: ${tag}`], {
      cwd: params.cwd,
      dryRun: params.dryRun,
    })
  }

  if (await tagExists(tag, params.cwd)) {
    throw new Error(`Tag already exists: ${tag}`)
  }

  await run('git', ['tag', tag], {
    cwd: params.cwd,
    dryRun: params.dryRun,
  })

  await run('git', ['push'], {
    cwd: params.cwd,
    dryRun: params.dryRun,
  })

  await run('git', ['push', 'origin', tag], {
    cwd: params.cwd,
    dryRun: params.dryRun,
  })
}
