import path from 'node:path'
import fs from 'node:fs'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import MagicStr from 'magic-string'
import { init as importInit, parse as importParse } from 'es-module-lexer'
import consola from 'consola'
import { dynamicImport, isObject, normalizePath, resolveSymbolicLink, tranformPath } from './utils'
import { CACHEDIRNAME, CONFIGFILE } from './constants'
import { transformTypeScript } from './transform'
import type { CommitStep } from './server'
import type { Plugin } from './plugins'
import { defaultPlugin } from './plugins/default'
import type { Logger } from './logger'
import { createLogger } from './logger'
import { resolveId } from './resolve'

// file config
export interface UserConfigExport {
  /**
   * 一些设置
   */
  options?: {
    /**
       * 是否使用默认的steps
       */
    useDefaultSteps?: boolean
    /**
       * 提交大小限制
       */
    subjectLimit?: number
  }
  /**
   * 步骤
   */
  steps?: CommitStep[]
  /**
   * 简单的插件实现
   */
  plugins?: Plugin[]
}

export interface InnerConfigExport {
  inline: {
    debug?: boolean
    d?: boolean
    c?: string
    global?: boolean
  }
  paths: {
    /**
     * coonfig 所在文件夹
     */
    root: string
    /**
     * 全局node_module
     */
    globalNodeModulePath?: string
    /**
     * 当前js运行文件夹 所处项目node_module
     */
    processNodeModulePath?: string
  }
  isGlobal: boolean
  logger: Logger
}

export type CommitizenConfigExport = UserConfigExport & InnerConfigExport

//  inline config
export async function resolveConfig(
  inlineConfig: InnerConfigExport['inline'] = {},
) {
  const { processNodeModulePath, globalNodeModulePath, isGlobal } = determineGlobal(inlineConfig)
  const root = determineRoot(globalNodeModulePath, processNodeModulePath, isGlobal)

  const paths = {
    root,
    processNodeModulePath,
    globalNodeModulePath,
  }

  const config: InnerConfigExport = {
    inline: inlineConfig,
    isGlobal,
    logger: createLogger(),
    paths,
  }

  config.inline.debug && consola.log(config)

  const fileConfig = await resolveConfigFile(root, config)

  let merge = mergeConfigs(config, fileConfig ?? {}) as CommitizenConfigExport

  merge = setDefaultConfig(merge)

  return merge
}

function setDefaultConfig(
  config: CommitizenConfigExport,
) {
  // add default plugins
  if (!config.plugins)
    config.plugins = []
  if (!config.steps)
    config.steps = []

  if (config.plugins
    && Array.isArray(config.plugins)
    && config.options
    && config.options.useDefaultSteps
  ) {
    config.plugins.push(
      defaultPlugin(),
    )
  }
  return config
}

async function resolveConfigFile(
  root: string,
  config: InnerConfigExport,
): Promise<UserConfigExport | undefined> {
  const logger = config.logger
  try {
    let filePath: string | undefined
    let raw: string | undefined

    if (root) {
      filePath = path.resolve(root, CONFIGFILE)
      raw = fs.readFileSync(filePath, { encoding: 'utf8' })
    }
    else {
      raw = ''
      logger.warn(`config file not found with path: ${config.paths}`)
    }

    const code = await resolveConfigAndTransform(raw, config)

    const userConfig = (
      await dynamicImport(
        `data:text/javascript;base64,${
              Buffer.from(code).toString('base64')}`,
      )
    ).default

    return userConfig
  }
  catch (error) {
    logger.error(error)
  }
}

async function resolveConfigAndTransform(
  raw: string,
  config: InnerConfigExport,
) {
  await importInit

  const js = await transformTypeScript(raw)

  const magicstr = new MagicStr(js)

  const [imports] = importParse(js)

  imports.forEach((imp) => {
    if (imp.n) {
      let resultPath = resolveId(imp.n, config)

      resultPath = tranformPath(resultPath).toString()

      magicstr.overwrite(imp.s, imp.e, resultPath, { contentOnly: true })
    }
  })
  return magicstr.toString()
}

function mergeConfigs(
  defaults: Record<string, any>,
  overrides: Record<string, any>,
  rootPath = '',
) {
  const merged: Record<string, any> = { ...defaults }

  for (const key in overrides) {
    const value = overrides[key]
    if (value == null)
      continue

    const existing = merged[key]
    if (isObject(existing) && isObject(value)) {
      merged[key] = mergeConfigs(
        existing,
        value,
        rootPath ? `${rootPath}.${key}` : key,
      )
      continue
    }

    merged[key] = value
  }

  return merged
}

function determineGlobal(
  inlineConfig: InnerConfigExport['inline'] = {},
) {
  let nodePath = path.dirname(process.argv0)

  const isLink = fs.lstatSync(nodePath).isSymbolicLink()
  if (isLink)
    nodePath = resolveSymbolicLink(nodePath)

  const globalNodeModulePath = normalizePath(path.resolve(nodePath, 'node_modules'))
  const workPath = path.dirname(__dirname)
  const processNodeModulePath = normalizePath(path.resolve(workPath, 'node_modules'))

  return {
    globalNodeModulePath,
    processNodeModulePath,
    isGlobal: inlineConfig.global || processNodeModulePath.includes(globalNodeModulePath),
    // isGlobal: true,
  }
}

function determineRoot(
  globalNodeModulePath: string,
  workNodeModulePath: string,
  isGlobal: boolean,
) {
  return normalizePath(isGlobal ? path.resolve(globalNodeModulePath, CACHEDIRNAME) : process.cwd())
}

export function defineConfig(config: UserConfigExport): UserConfigExport {
  return config
}
