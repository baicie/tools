import { release } from '../packages/release/src'

release({
  repo: 'baicie',
  packages: [
    'cli',
    'release',
    'tools',
    'pkg',
    'polyfill',
    'storage',
    'logger',
    'scripts',
  ],
  toTag: (pkg, version) => `${pkg}@${version}`,
  logChangelog: _pkg => {},
  generateChangelog: _pkg => {},
})
