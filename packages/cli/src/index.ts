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
  if (!options.projectName) {
    options.projectName = await askProjectName()
  }

  options.description = await askDescription()
  options.npm = (await askNpm()) as IProjectConf['npm']
  options.templateSource = await askTemplateSource()
  options.logger.debug('options.templateSource', options.templateSource)

  if (options.templateSource === 'self-input') {
    options.templateSource = await askSelfInputTemplateSource()
  }

  const templates = await fetchTemplates(options)
  options.template = await askTemplate(templates)

  options.gitInit = await askGitInit()
  options.autoInstall = await askAutoInstall()

  if (options.gitInit) {
    options.gitRemote = await askGitRemote()
  }

  return options
}

export async function write(conf: IProjectConf): Promise<void> {
  await createApp(conf)
}
