# @baicie/prettier-config

Unified Prettier configuration package for the Baicie project ecosystem.

## Installation

```bash
pnpm add -D @baicie/prettier-config
```

## Usage

### Basic Usage

Create a `prettier.config.js` file:

```js
// prettier.config.js
export { default } from '@baicie/prettier-config'
```

Or use the shorthand:

```js
// prettier.config.js
import config from '@baicie/prettier-config'

export default config
```

### Vue.js Configuration

For Vue.js projects:

```js
// prettier.config.js
export { default } from '@baicie/prettier-config/vue'
```

**Features**:

- Optimized for Vue Single File Components
- Proper HTML whitespace sensitivity
- Aligned attributes in templates

### Integration with ESLint

To use with ESLint, install eslint-config-prettier:

```bash
pnpm add -D eslint-config-prettier
```

Then add it to your ESLint config:

```js
// eslint.config.js
import baicieConfig from '@baicie/eslint-config'
import prettier from 'eslint-config-prettier'

export default [...baicieConfig, prettier]
```

## Configuration Options

| Option        | Value   | Description       |
| ------------- | ------- | ----------------- |
| singleQuote   | `true`  | Use single quotes |
| semi          | `true`  | Use semicolons    |
| trailingComma | `'all'` | Trailing commas   |
| printWidth    | `100`   | Max line length   |
| tabWidth      | `2`     | Indentation size  |
| endOfLine     | `'lf'`  | Line endings      |

## License

MIT
