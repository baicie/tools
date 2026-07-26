import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const ROOT_DIR = resolve(fileURLToPath(import.meta.url), '..', '..')
const RELEASE_PACKAGES = [
  '@baicie/cli',
  '@baicie/release',
  '@baicie/tools',
  '@baicie/pkg',
  '@baicie/storage',
  '@baicie/logger',
  '@baicie/scripts',
  '@baicie/clean',
]

function parsePackageArgs(args: string[]) {
  const selected = []

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== '--package') {
      throw new Error(`Unknown option: ${args[index]}`)
    }

    const name = args[index + 1]
    if (!name) throw new Error('--package requires a package name')
    selected.push(name)
    index += 1
  }

  return selected.length > 0 ? selected : RELEASE_PACKAGES
}

function packageDirectory(name: string) {
  const shortName = name.replace('@baicie/', '')
  const directory = resolve(ROOT_DIR, 'packages', shortName)
  const packagePath = resolve(directory, 'package.json')

  if (!existsSync(packagePath)) {
    throw new Error(`Unknown release package: ${name}`)
  }

  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
  if (pkg.name !== name) {
    throw new Error(`Package name mismatch in ${packagePath}`)
  }

  return directory
}

async function main() {
  const packages = parsePackageArgs(process.argv.slice(2))

  await execa('pnpm', ['build'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  })

  for (const name of packages) {
    const cwd = packageDirectory(name)
    console.log(`\nPacking ${name} without publishing...`)
    await execa('npm', ['pack', '--dry-run'], {
      cwd,
      stdio: 'inherit',
    })
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
