import type { UserConfigExport } from '../config'
import type { Plugin } from '../plugins'
import type { CommitStep } from '../server'

function setDefaultSteps(
  config?: UserConfigExport,
) {
  if (config && config.options && config.options.useDefaultSteps) {
    const stepsHeader: CommitStep[] = [
      {
        key: 'type',
        message: '选择一种你的提交类型',
        type: 'select',
        choices: [
          { value: 'feat', name: 'feat:      一个新的特性' },
          { value: 'fix', name: 'fix:       修复一个Bug' },
          { value: 'docs', name: 'docs:      变更的只有文档' },
          { value: 'style', name: 'style:     空格, 分号等格式修复' },
          { value: 'refactor', name: 'refactor:  代码重构，注意和特性、修复区分开' },
          { value: 'perf', name: 'perf:      提升性能' },
          { value: 'test', name: 'test:      添加一个测试' },
          { value: 'build', name: 'build:     影响构建系统或外部依赖项的更改' },
          { value: 'ci', name: 'ci:        更改为我们的CI配置文件和脚本' },
        ],
      },
      {
        key: 'subject',
        message: '短描述',
        type: 'input',
      },

    ]
    config.steps.unshift(...stepsHeader)

    const stepsFotter: CommitStep[] = [
      {
        key: 'confirmCommit',
        message: '确定提交?',
        type: 'confirm',
      },
    ]

    config.steps.push(...stepsFotter)
  }
}

export function defaultPlugin(): Plugin {
  const plugin: Plugin = {
    name: 'commitizen-default',
    loadConfig(config) {
      setDefaultSteps(config)
      return config
    },
    generatorMessage(messsage) {
      if (messsage.type && messsage.subject)
        return `${messsage.type}: ${messsage.subject}`
    },
  }

  return plugin
}
