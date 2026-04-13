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
    'eslint-config',
    'prettier-config',
    'tsconfig',
  ],
  linkedPackages: {
    napi: ['napi-browser'],
  },
  toTag: (pkg, version) => `${pkg}@${version}`,
  logChangelog: _pkg => {
    void _pkg
  },
  generateChangelog: (_pkg, _version) => {
    void _pkg
    void _version
  },
})
