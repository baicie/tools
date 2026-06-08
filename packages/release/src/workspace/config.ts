import type { ReleaseConfig } from './types'

export function defineReleaseConfig(config: ReleaseConfig): ReleaseConfig {
  return {
    ...config,
    packageManager: config.packageManager ?? 'pnpm',
    publish: {
      access: 'public',
      provenance: true,
      skipExisting: true,
      retry: 5,
      ...(config.publish ?? {}),
    },
    readiness: {
      common: true,
      allowZero: false,
      strict: false,
      ...(config.readiness ?? {}),
    },
  }
}
