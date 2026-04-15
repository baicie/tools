import { release } from '../packages/release/src'

release({
  repo: 'baicie',
  packages: [
    'cli',
    'release',
    'tools',
    'pkg',
    'storage',
    'logger',
    'scripts',
    'napi',
    'clean',
  ],
  linkedPackages: {
    napi: ['napi-browser'],
  },
  toTag: (pkg, version) => `${pkg}@${version}`,
})
