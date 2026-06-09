import type { ReleaseConfig } from './types'

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { readJson } from './fs'

interface ChangesetsConfig {
  fixed?: string[][]
  ignore?: string[]
  access?: 'public' | 'restricted'
}

function getChangesetsConfigPath(config: ReleaseConfig): string {
  return resolve(
    config.cwd ?? process.cwd(),
    config.changesets?.configFile ?? '.changeset/config.json',
  )
}

export function readChangesetsConfig(config: ReleaseConfig): ChangesetsConfig {
  const file = getChangesetsConfigPath(config)

  if (!existsSync(file)) {
    return {}
  }

  return readJson<ChangesetsConfig>(file)
}

export function getChangesetsIgnore(config: ReleaseConfig): string[] {
  if (config.changesets?.readIgnore === false) {
    return []
  }

  return readChangesetsConfig(config).ignore ?? []
}

export function getChangesetsFixedPackages(config: ReleaseConfig): string[] {
  if (config.fixedPackages?.length) {
    return config.fixedPackages
  }

  if (config.changesets?.readFixed === false) {
    return []
  }

  const fixed = readChangesetsConfig(config).fixed ?? []
  return Array.from(new Set(fixed.flat()))
}
