import { spawn } from 'node:child_process'
import process from 'node:process'
import { confirm, input, select } from '@inquirer/prompts'
import type { PluginContainer } from './plugins'
import { pluginContainer } from './plugins'
import type { CommitizenConfigExport, InnerConfigExport } from './config'
import { resolveConfig } from './config'

export interface CommonStepConfig {
  key: string
  message: string
  validate?: (value: string) => boolean
}

export type InputStepConfig = CommonStepConfig & {
  type: 'input'
  default?: string
}

export type SelectStepConfig = CommonStepConfig & {
  type: 'select'
  choices: {
    value: string
    name?: string
    description?: string
    disabled?: boolean | string
  }[]
}

export type ConfirmStepConfig = CommonStepConfig & {
  type: 'confirm'
}

export type CommitStep = InputStepConfig | SelectStepConfig | ConfirmStepConfig

export interface PromptsServer {
  config: CommitizenConfigExport
  plugins: PluginContainer
  result: Record<string, string | number | boolean>
  message: string
}

export async function createService(
  inlineConfig: InnerConfigExport['inline'] = {},
) {
  const config = await resolveConfig(inlineConfig)
  const container = await pluginContainer(config)

  const server: PromptsServer = {
    config: container.loadConfig(config),
    plugins: container,
    result: {},
    message: '',
  }

  await createSteps(server)

  messageServer(server)

  return server
}

/**
 * 执行询问
 * @param server
 */
export async function createSteps(
  server: PromptsServer,
) {
  const steps = server.config.steps
  const prompts = server.result

  for (const step of steps) {
    switch (step.type) {
      case 'input':{
        const result = await input({
          ...step,
        })
        prompts[step.key] = result
        break
      }
      case 'select':{
        const result = await select({
          ...step,
        })
        prompts[step.key] = result
        break
      }
      case 'confirm':{
        const result = await confirm({
          ...step,
        })
        prompts[step.key] = result
        break
      }
    }
  }
}

function messageServer(
  server: PromptsServer,
) {
  const plugins = server.plugins
  const result = server.result
  const logger = server.config.logger
  let called = false

  server.message = plugins.generatorMessage(result) ?? ''

  if (!server.message)
    return

  const args = ['commit', '-m', server.message]
  const child = spawn('git', args, {
    cwd: process.cwd(),
  })

  function done(err: Error | null) {
    err && logger.error(err.message)
  }

  child.on('error', (err) => {
    if (called)
      return
    called = true

    done(err)
  })

  child.on('exit', (code, signal) => {
    if (called)
      return
    called = true

    if (code) {
      if (code === 128) {
        console.warn(`
          Git exited with code 128. Did you forget to run:

            git config --global user.email "you@example.com"
            git config --global user.name "Your Name"
          `)
      }
      done(Object.assign(new Error(`git exited with error code ${code}`), { code, signal }))
    }
    else {
      done(null)
    }
  })
}
