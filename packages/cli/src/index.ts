import { createApp } from './create'
import {
  type IProjectConf,
  askAutoInstall,
  askDescription,
  askGitInit,
  askGitRemote,
  askNpm,
  askProjectName,
  askSelfInputTemplateSource,
  askTemplate,
  askTemplateSource,
  fetchTemplates,
} from './steps'

export async function ask(options: IProjectConf): Promise<IProjectConf> {
  const interactive = !options.template

  if (!options.projectName) {
    options.projectName = await askProjectName()
  }

  if (options.description === undefined) {
    options.description = await askDescription()
  }

  if (!options.npm) {
    options.npm = (await askNpm()) as IProjectConf['npm']
  }

  if (!options.templateSource) {
    options.templateSource = await askTemplateSource()
  }
  options.logger.debug('options.templateSource', options.templateSource)

  if (options.templateSource === 'self-input') {
    options.templateSource = await askSelfInputTemplateSource()
  }

  const templates = await fetchTemplates(options)
  if (!options.template) {
    options.template = await askTemplate(templates)
  }

  if (interactive || options.gitInit === undefined) {
    options.gitInit = await askGitInit()
  }

  if (interactive || options.autoInstall === undefined) {
    options.autoInstall = await askAutoInstall()
  }

  if (options.gitInit && !options.gitRemote) {
    options.gitRemote = await askGitRemote()
  }

  return options
}

export async function write(conf: IProjectConf): Promise<void> {
  await createApp(conf)
}
