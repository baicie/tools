import colors from 'picocolors'

import { run } from './exec'

export async function gitStatus(): Promise<string> {
  const result = await run('git', ['status', '--porcelain'], {
    stdio: 'pipe',
  })

  return result.stdout.trim()
}

export async function assertCleanGit(): Promise<void> {
  const status = await gitStatus()

  if (status) {
    throw new Error(
      'Git working tree is not clean. Commit or stash changes before release.',
    )
  }
}

export async function tagExists(tag: string): Promise<boolean> {
  const result = await run('git', ['tag', '-l', tag], {
    stdio: 'pipe',
    reject: false,
  })

  return result.stdout.trim() === tag
}

export async function commitAndTag(params: {
  version: string
  dryRun: boolean
  skipGit: boolean
}): Promise<void> {
  if (params.skipGit) {
    console.log(colors.yellow('skipGit enabled; not committing or tagging.'))
    return
  }

  const status = await gitStatus()
  const tag = `v${params.version}`

  if (status) {
    await run('git', ['add', '-A'], { dryRun: params.dryRun })
    await run('git', ['commit', '-m', `release: ${tag}`], {
      dryRun: params.dryRun,
    })
  }

  if (await tagExists(tag)) {
    throw new Error(`Tag already exists: ${tag}`)
  }

  await run('git', ['tag', tag], { dryRun: params.dryRun })
  await run('git', ['push'], { dryRun: params.dryRun })
  await run('git', ['push', 'origin', tag], { dryRun: params.dryRun })
}
