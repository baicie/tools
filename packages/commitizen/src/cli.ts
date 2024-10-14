import cac from 'cac'
import { createService } from './server'

const cli = cac('bcz')

cli.command('[root]', 'commit tools server')
  .option('-c <string>', 'config file path')
  .option('-d, --debug [feat]', '[string | boolean] show debug logs')
  .option('-g, --global [feat]', '[boolean] use global ')
  .action(async (root, options) => {
    try {
      createService(options)
    }
    catch (error) {

    }
  })

cli.help()

cli.parse()
