import type { CommitizenConfigExport } from './config'
import type { PromptsServer } from './server'

export interface Plugin {
  name: string
  /**
   * config设置
   * @param config
   * @returns
   */
  loadConfig?: (config: CommitizenConfigExport) => CommitizenConfigExport
  /**
   * message生成
   * @param messsage
   * @returns
   */
  generatorMessage?: (messsage: PromptsServer['result'], server?: PromptsServer) => string | undefined
}

type PluginRepuired = Required<Plugin>

export interface PluginContainer {
  generatorMessage: PluginRepuired['generatorMessage']
  loadConfig: PluginRepuired['loadConfig']
}

export async function pluginContainer(
  config: CommitizenConfigExport,
): Promise<PluginContainer> {
  function generatorMessage(message: PromptsServer['result']) {
    let res: string | undefined
    for (const plugin of config?.plugins) {
      if (plugin.generatorMessage) {
        res = plugin.generatorMessage(message)
        if (config.options && config.options.subjectLimit) {
          if (res && res.length > config.options.subjectLimit) {
            config.logger.error('Invalid message length for generator')
            break
          }
        }
      }
    }
    return res
  }

  function loadConfig(config: CommitizenConfigExport) {
    let res = config
    for (const plugin of config?.plugins) {
      if (plugin.loadConfig)
        res = plugin.loadConfig(config)
    }
    return res
  }

  return {
    generatorMessage,
    loadConfig,
  }
}
