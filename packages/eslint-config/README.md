# @baicie/eslint-config

Unified ESLint configuration package for the Baicie project ecosystem.

## Installation

```bash
pnpm add -D @baicie/eslint-config
```

## Usage

### Base Configuration

For general TypeScript projects:

```js
// eslint.config.js
import config from '@baicie/eslint-config';

export default config;
```

### React Configuration

For React projects:

```js
// eslint.config.js
import config from '@baicie/eslint-config/react';

export default config;
```

### Node.js Configuration

For backend Node.js projects:

```js
// eslint.config.js
import config from '@baicie/eslint-config/node';

export default config;
```

### Strict Configuration

For projects requiring stricter code quality:

```js
// eslint.config.js
import config from '@baicie/eslint-config/strict';

export default config;
```

### NestJS Configuration

For NestJS backend projects:

```js
// eslint.config.js
import config from '@baicie/eslint-config/nestjs';

export default config;
```

**Features**:
- Enforces NestJS naming conventions (Controller, Service, Module, etc.)
- Supports decorators and dependency injection patterns
- DTO and entity naming conventions

### Vue.js Configuration

For Vue.js frontend projects (Vue 2 / Vue 3):

```js
// eslint.config.js
import config from '@baicie/eslint-config/vue';

export default config;
```

**Features**:
- Vue 3 Composition API support
- Vue Single File Component rules
- TypeScript support in Vue files
- Enforces `<script setup>` syntax

## Configuration Options

### TypeScript

The base configuration includes TypeScript support via `typescript-eslint`.

### Import Sorting

Imports are automatically sorted and organized by groups.

### Unused Imports

Unused imports are automatically removed on save.

## License

MIT
