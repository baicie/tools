import cac from 'cac'
import colors from 'picocolors'
import { clean } from './clean'
import type { CleanOptions } from './types'

const cli = cac('ba-clean')

cli
  .option('-r, --root <path>', 'Root directory to scan (default: cwd)')
  .option('-v, --verbose', 'Show detailed progress')
  .option('-d, --dry', 'Dry run mode - only show what would be deleted')
  .option('--node-modules', 'Only clean node_modules')
  .option('--target', 'Only clean target (Rust build)')
  .help()

const parsed = cli.parse()

if (parsed.options.help) {
  process.exit(0)
}

const options: CleanOptions = {
  root: parsed.options.root || process.cwd(),
  verbose: parsed.options.verbose || false,
  dry: parsed.options.dry || false,
}

if (parsed.options.nodeModules) {
  options.targets = ['node_modules']
} else if (parsed.options.target) {
  options.targets = ['target']
} else {
  options.targets = ['node_modules', 'target']
}

console.info(colors.cyan(`\n🔍 Scanning ${options.root}...\n`))

clean(options)
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(colors.red(`\nError: ${error.message}`))
    process.exit(1)
  })
