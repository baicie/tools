import {
  defineReleaseConfig,
  generateChangelog,
  publish,
  release,
  runCanaryCli,
  runPrecheckCli,
  runPublishCli,
  runReadinessCli,
  runReleaseCli,
  runReleasePlanCli,
  runVersionPackagesCli,
} from '../src/index'

describe('@baicie/release public API', () => {
  it('keeps legacy exports', () => {
    expect(typeof release).toBe('function')
    expect(typeof publish).toBe('function')
    expect(typeof generateChangelog).toBe('function')
  })

  it('adds workspace release exports', () => {
    expect(typeof defineReleaseConfig).toBe('function')
    expect(typeof runReleaseCli).toBe('function')
    expect(typeof runPublishCli).toBe('function')
    expect(typeof runPrecheckCli).toBe('function')
    expect(typeof runReadinessCli).toBe('function')
    expect(typeof runReleasePlanCli).toBe('function')
    expect(typeof runVersionPackagesCli).toBe('function')
    expect(typeof runCanaryCli).toBe('function')
  })

  it('merges workspace defaults without overriding user config', () => {
    const config = defineReleaseConfig({
      repo: 'baicie/example',
      repositoryUrl: 'https://github.com/baicie/example.git',
      mode: 'workspace-fixed',
      workspace: {
        roots: ['packages'],
      },
      publish: {
        provenance: false,
      },
      readiness: {
        strict: true,
      },
    })

    expect(config.packageManager).toBe('pnpm')
    expect(config.publish).toMatchObject({
      access: 'public',
      provenance: false,
      skipExisting: true,
      retry: 5,
    })
    expect(config.readiness).toMatchObject({
      common: true,
      allowZero: false,
      strict: true,
    })
  })

  it('applies default values when optional fields are omitted', () => {
    const config = defineReleaseConfig({
      repo: 'baicie/test',
      repositoryUrl: 'https://github.com/baicie/test.git',
      mode: 'workspace-fixed',
      workspace: {
        roots: ['packages'],
      },
    })

    expect(config.packageManager).toBe('pnpm')
    expect(config.publish).toMatchObject({
      access: 'public',
      provenance: true,
      skipExisting: true,
      retry: 5,
    })
    expect(config.readiness).toMatchObject({
      common: true,
      allowZero: false,
      strict: false,
    })
  })
})
