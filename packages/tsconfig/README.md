# @baicie/tsconfig

Unified TypeScript configuration package for the Baicie project ecosystem.

## Installation

```bash
pnpm add -D @baicie/tsconfig
```

## Usage

### Base Configuration

For general TypeScript projects:

```json
{
  "extends": "@baicie/tsconfig/base.json"
}
```

### React Configuration

For React projects:

```json
{
  "extends": "@baicie/tsconfig/react.json"
}
```

### Node.js Configuration

For backend Node.js projects:

```json
{
  "extends": "@baicie/tsconfig/node.json"
}
```

### Library Configuration

For shared libraries with composite mode:

```json
{
  "extends": "@baicie/tsconfig/library.json"
}
```

### Strict Configuration

For projects requiring the strictest type checking:

```json
{
  "extends": "@baicie/tsconfig/strict.json"
}
```

### NestJS Configuration

For NestJS backend projects:

```json
{
  "extends": "@baicie/tsconfig/nestjs.json"
}
```

**Features**:
- Decorator support (`experimentalDecorators`, `emitDecoratorMetadata`)
- Path alias support (`@/*`)
- Jest types included

### Vue.js Configuration

For Vue.js frontend projects:

```json
{
  "extends": "@baicie/tsconfig/vue.json"
}
```

**Features**:
- Vue JSX support
- Path aliases (`@/*`, `@components/*`, `@views/*`, etc.)
- Vite client types

## Configuration Options

### Base Configuration

| Option | Value | Description |
|--------|-------|-------------|
| target | `ES2022` | Compilation target |
| module | `ESNext` | Module system |
| strict | `true` | Enable strict mode |
| moduleResolution | `Bundler` | Module resolution strategy |
| skipLibCheck | `true` | Skip type checking of declaration files |

### Available Presets

- **base.json** - General TypeScript projects
- **react.json** - React/React Native projects
- **node.json** - Node.js backend projects
- **library.json** - Shared libraries (with composite mode)
- **strict.json** - Maximum strictness
- **nestjs.json** - NestJS backend projects
- **vue.json** - Vue.js frontend projects

## License

MIT
