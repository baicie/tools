import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import consola from 'consola'
import chalk from 'chalk'
import { findWorkspacePackages } from '@pnpm/find-workspace-packages'
import type { Project } from '@pnpm/find-workspace-packages'

export const projectRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..')
const getWorkspacePackages = () => findWorkspacePackages(projectRoot)

function errorAndExit(err: Error): never {
  consola.error(err)
  process.exit(1)
}

async function main() {
  const version = process.env.TAG_VERSION
  const gitHead = process.env.GIT_HEAD
  if (!version) {
    errorAndExit(
      new Error('No version'),
    )
  }

  consola.log(chalk.cyan(`$new version: ${version}`))
  consola.log(chalk.cyan(`$GIT_HEAD: ${gitHead}`))
  consola.debug(chalk.yellow('Updating package.json for @baicie/commitizen'))

  const pkgs = Object.fromEntries(
    (await getWorkspacePackages()).map(pkg => [pkg.manifest.name!, pkg]),
  )

  const BaicieCli = pkgs['@baicie/commitizen']

  const writeVersion = async (project: Project) => {
    await project.writeProjectManifest({
      ...project.manifest,
      version,
      gitHead,
    } as any)
  }

  try {
    await writeVersion(BaicieCli)
  }
  catch (error) {
    errorAndExit(error as Error)
  }

  consola.success(chalk.green(`package @baicie/commitizen updated successfully to version ${version}`))
}

main()
