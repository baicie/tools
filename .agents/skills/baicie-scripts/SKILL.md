---
name: baicie-scripts
description: Guide agents to integrate and maintain @baicie/scripts, the internal utility package that currently provides commit message validation through verifyCommit. Use when a user asks how to add, configure, debug, test, or document packages/scripts, @baicie/scripts, commit-msg hooks, or Conventional Commits validation in this workspace.
---

# Baicie Scripts

## Scope

Use `@baicie/scripts` for internal project scripting utilities. The package currently exposes `verifyCommit(msgPath?: string)`, a commit message validator intended for `commit-msg` hooks and CI-like checks.

Do not treat this package as a general script runner. Its public surface is intentionally small and currently centered on commit message validation.

## Public API

Import from the package root:

```ts
import { verifyCommit } from '@baicie/scripts'

verifyCommit()
```

`verifyCommit()` reads `.git/COMMIT_EDITMSG` by default. Pass a file path when validating a specific message file:

```ts
verifyCommit('/tmp/commit-msg.txt')
```

On invalid input it prints a formatted error and exits with status `1`. This is expected behavior for hook usage.

## Validation Rule

`verifyCommit` accepts Conventional Commits with this type set:

```txt
feat, fix, docs, dx, style, refactor, perf, test, workflow, build, ci, chore, types, wip, release
```

Accepted shape:

```txt
<type>(<scope>): <subject>
<type>: <subject>
revert: <type>(<scope>): <subject>
```

The subject must be 1 to 50 characters according to the current implementation. Examples:

```txt
feat(compiler): add comments option
fix(v-model): handle events on blur
docs: update scripts usage
```

When changing the rule, keep it aligned with the root `AGENTS.md` commit message convention and update package docs if behavior changes.

## Hook Integration

In this repo, the root hook calls a small wrapper:

```ts
import { verifyCommit } from '../packages/scripts/src'

verifyCommit()
```

The root `package.json` uses:

```json
{
  "simple-git-hooks": {
    "commit-msg": "pnpm exec tsx scripts/verify-commit.ts"
  }
}
```

For another repo, either import the built package:

```ts
import { verifyCommit } from '@baicie/scripts'

verifyCommit()
```

or create a local wrapper script and call it from Husky or `simple-git-hooks`.

## Package Shape

Source files:

- `packages/scripts/src/index.ts`: exports public API.
- `packages/scripts/src/verify-commit.ts`: implements commit message validation.
- `packages/scripts/rolldown.config.ts`: builds ESM, CJS, and declaration output.

Build output:

- ESM: `dist/index.js`
- CJS: `dist/index.cjs`
- Types: `dist/index.d.ts`

`picocolors` is the only runtime dependency and is marked external by the build config. Node built-ins should use the `node:` prefix.

## Maintenance Workflow

When modifying `packages/scripts`, keep the public API small and export new utilities from `src/index.ts`.

Follow the repo TypeScript constraints:

- Use strict TypeScript.
- Avoid `any`, optional chaining, nullish coalescing, object spread, and `async/await`.
- Prefer `interface` for object shapes.
- Use `import type` for type-only imports.
- Use `node:` prefixes for Node built-ins.

Run focused checks:

```bash
pnpm --filter @baicie/scripts typecheck
pnpm --filter @baicie/scripts build
```

If validation behavior changes, add or update tests/docs near the changed behavior. At minimum, manually check valid and invalid commit examples through a temporary message file before shipping a rule change.

## Troubleshooting

- Hook cannot find the package: make sure dependencies are installed and the hook command runs from repo root.
- Valid-looking message fails: compare its type, optional scope, colon-space separator, and subject length against the current regex.
- Error output appears during tests: `verifyCommit` calls `process.exit(1)` on invalid messages; tests should isolate or mock exit behavior if added.
- Published package import fails: rebuild `@baicie/scripts` and confirm `package.json` `main`, `module`, `types`, and `exports` point to `dist`.
