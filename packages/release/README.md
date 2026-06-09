# @baicie/release 使用文档

`@baicie/release` 是用于 monorepo 固定版本发版的内部 release 工具包，适合 Zeus、Zeus UI，以及其他需要统一版本、统一 changelog、canary 发版、publish-only 补发的仓库。

它主要解决以下问题：

- 多包 workspace 固定版本发布；
- 自动更新 package version；
- 自动更新 root `package.json` version；
- 自动生成统一 `CHANGELOG.md`；
- 支持 changesets fixed group；
- 支持 npm publish dry-run；
- 支持跳过已存在版本；
- 支持 npm provenance；
- 支持 canary 版本；
- 支持发布失败后重新执行 `publishOnly`；
- 支持 CI 中 tag 触发稳定发版；
- 支持 canary 发布后触发下游仓库兼容检查。

---

## 一、核心发版模型

当前推荐采用两种模式：

```ts
type ReleaseMode = 'changesets-fixed' | 'workspace-fixed'
```

### 1. `changesets-fixed`

适合使用 changesets 管理发版说明的 monorepo。

特点：

- 从 `.changeset/config.json` 读取 `fixed` 包组；
- 自动生成 synthetic changeset；
- 执行 `pnpm changeset version`；
- 强制 fixed group 内所有包版本一致；
- 统一生成 root `CHANGELOG.md`；
- 清理 changesets 生成的包级 `CHANGELOG.md`；
- 如果包级 `CHANGELOG.md` 原本存在，会恢复原内容，避免误删历史文件；
- 如果包级 `CHANGELOG.md` 原本不存在，生成后会删除。

推荐用于 Zeus 主仓库。

### 2. `workspace-fixed`

适合不使用 changesets，只希望直接统一更新所有发布包版本的场景。

特点：

- 直接遍历 publishable packages；
- 统一更新 package version；
- 更新 root `package.json` version；
- 可通过 `afterVersion` 自定义后处理。

适合简单工具包仓库或不需要 changeset 文档流的项目。

---

## 二、安装与脚本接入

在目标仓库中安装：

```bash
pnpm add -D @baicie/release
```

在根目录新增 release 配置文件，例如：

```ts
// release.config.ts
import { defineReleaseConfig } from '@baicie/release'

export default defineReleaseConfig({
  repo: 'baicie/zeus',
  repositoryUrl: 'https://github.com/baicie/zeus',
  mode: 'changesets-fixed',

  packageManager: 'pnpm',

  workspace: {
    roots: ['packages', 'integrations', 'create', 'devtools'],

    ignore: ['@zeus-js/playground'],

    publishable(pkg) {
      return pkg.name.startsWith('@zeus-js/')
    },
  },

  rootVersionPackage: '@zeus-js/zeus',

  changelogFile: 'CHANGELOG.md',

  changesets: {
    configFile: '.changeset/config.json',
    releaseFile: '.changeset/release.md',
    requireChangeset: false,
    readIgnore: true,
    readFixed: true,
    cleanupPackageChangelogs: true,
    unifiedChangelog: true,
  },

  publish: {
    access: 'public',
    provenance: true,
    skipExisting: true,
    retry: 5,
  },

  precheck: {
    commands: [
      ['pnpm', 'install', '--frozen-lockfile'],
      ['pnpm', 'typecheck'],
      ['pnpm', 'lint'],
      ['pnpm', 'test'],
      ['pnpm', 'build'],
    ],
  },

  canary: {
    enabled: true,
    prefix: 'canary',
    tag: 'canary',
    envName: 'CANARY_VERSION',
    includeBranches: ['main', 'feat/**', 'fix/**', 'release/**', 'hotfix/**'],
    dispatch: {
      tokenEnv: 'ZEUS_UI_DISPATCH_TOKEN',
      repository: 'baicie/zeus-ui',
      eventType: 'zeus-canary-published',
      payload({ version, sha }) {
        return {
          source: 'baicie/zeus',
          version,
          sha,
        }
      },
    },
  },
})
```

然后在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "release": "baicie-release",
    "release:publish": "baicie-release publish",
    "release:version": "baicie-release version:packages",
    "release:canary": "baicie-release canary"
  }
}
```

如果项目当前是通过自定义 CLI 入口加载配置，也可以保持现有封装，只要最终调用 `runRelease`、`runPublish`、`runCanary` 即可。

---

## 三、稳定版本发版流程

推荐稳定发版流程：

```bash
pnpm release
```

工具会执行：

1. 解析目标版本；
2. 确认 Git 工作区干净；
3. 更新 workspace packages 版本；
4. 更新 root `package.json` 版本；
5. 更新 lockfile；
6. 执行 precheck；
7. 生成 release plan；
8. 可选执行 npm publish dry-run；
9. 提交 release commit；
10. 创建 git tag；
11. push commit 和 tag；
12. 由 CI 根据 tag 执行真实 publish。

---

## 四、指定版本发版

直接指定版本：

```bash
pnpm release --version 0.1.0
```

发布 beta：

```bash
pnpm release --version 0.1.0-beta.0 --tag beta
```

发布 rc：

```bash
pnpm release --version 0.1.0-rc.0 --tag rc
```

---

## 五、dry-run

执行 dry-run：

```bash
pnpm release --version 0.1.0 --dry
```

dry-run 会执行大部分本地准备流程，包括：

- version 文件更新；
- changelog 更新；
- lockfile 更新；
- precheck；
- release plan；
- npm publish dry-run。

注意：完整 release dry-run 会改动本地 version、changelog 和 lockfile。执行后需要通过 `git diff` 检查，并手动还原。

```bash
git diff
git checkout -- .
```

---

## 六、publishOnly 补发

`publishOnly` 用于版本文件、tag、构建产物都已经准备好，但 npm publish 失败后重新发布。

例如 CI 中 tag 已经创建，但 publish 因 npm 网络或 provenance 问题失败，可以执行：

```bash
pnpm release --publishOnly 0.1.0 --skipBuild
```

建议补发前先 dry-run：

```bash
pnpm release --publishOnly 0.1.0 --skipBuild --dry
```

`publishOnly` 会校验：

- 必须传入 version；
- version 必须是合法 semver；
- 当前 packages 的版本必须与传入 version 一致；
- 非 dry-run 时必须存在 `NODE_AUTH_TOKEN` 或 `NPM_TOKEN`。

如果目标版本已经发布，并且配置了：

```ts
publish: {
  skipExisting: true,
}
```

则会跳过 npm 上已经存在的包，避免重复发布失败。

---

## 七、单独执行 publish

也可以只执行 publish 子命令：

```bash
pnpm release:publish --version 0.1.0 --tag latest
```

dry-run：

```bash
pnpm release:publish --version 0.1.0 --tag latest --dry
```

关闭 provenance：

```bash
pnpm release:publish --version 0.1.0 --no-provenance
```

不跳过已存在版本：

```bash
pnpm release:publish --version 0.1.0 --no-skip-existing
```

指定 registry：

```bash
pnpm release:publish --version 0.1.0 --registry https://registry.npmjs.org/
```

---

## 八、canary 发版

canary 用于每次主仓库更新后发布临时版本，供下游仓库验证兼容性。

执行：

```bash
pnpm release:canary
```

canary 版本格式：

```txt
{baseVersion}-canary.{date}.{runNumber}.{runAttempt}.{shortSha}
```

示例：

```txt
0.1.0-canary.20260609.123.1.a1b2c3d4
```

canary 流程：

1. 校验 canary 是否启用；
2. 校验是否在 CI 中运行；
3. 校验当前分支是否在 `includeBranches` 中；
4. 校验 npm token；
5. 生成 canary version；
6. 写入 `GITHUB_ENV`；
7. 更新 packages version；
8. 更新 lockfile；
9. 执行 precheck；
10. 执行 publish dry-run；
11. 执行真实 publish；
12. 触发下游 repository dispatch。

本地调试可以使用：

```bash
pnpm release:canary --force-local
```

注意：本地 force-local 仍然需要 npm token，且可能真实发布 canary 包，谨慎使用。

---

## 九、GitHub Actions 稳定发版示例

推荐稳定版本通过 tag 触发。

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org/
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm release --publishOnly ${GITHUB_REF_NAME#v} --skipBuild
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

如果启用 npm provenance，需要：

```yaml
permissions:
  contents: write
  id-token: write
```

---

## 十、GitHub Actions canary 示例

```yaml
name: Canary

on:
  push:
    branches:
      - main
      - 'feat/**'
      - 'fix/**'
      - 'release/**'
      - 'hotfix/**'

permissions:
  contents: read
  id-token: write

jobs:
  canary:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org/
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm release:canary
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          ZEUS_UI_DISPATCH_TOKEN: ${{ secrets.ZEUS_UI_DISPATCH_TOKEN }}
```

---

## 十一、下游仓库 repository dispatch 示例

Zeus canary 发布成功后，可以触发 Zeus UI 的兼容检查。

下游仓库新增 workflow：

```yaml
name: Zeus Canary Compatibility

on:
  repository_dispatch:
    types:
      - zeus-canary-published

jobs:
  compat:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v5

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org/
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Install Zeus canary
        run: |
          pnpm add -D @zeus-js/zeus@${{ github.event.client_payload.version }}
          pnpm add -D @zeus-js/compiler@${{ github.event.client_payload.version }}

      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

`ZEUS_UI_DISPATCH_TOKEN` 需要是一个 GitHub PAT，至少需要目标仓库的 repository dispatch 权限。

---

## 十二、changesets-fixed 的 changelog 语义

`changesets-fixed` 模式会生成统一 root changelog：

```txt
CHANGELOG.md
```

默认配置：

```ts
changesets: {
  cleanupPackageChangelogs: true,
  unifiedChangelog: true,
}
```

这表示：

- 保留根 `CHANGELOG.md`；
- 不保留 changesets 自动生成的包级 `CHANGELOG.md`；
- 如果某个包原本就有自己的 `CHANGELOG.md`，发版后会恢复原内容；
- 如果某个包原本没有 `CHANGELOG.md`，发版过程中生成的临时 changelog 会被删除；
- 即使 `changeset version` 之后的步骤失败，也会尝试恢复包级 changelog 并删除 synthetic changeset 文件。

这个行为用于避免 changesets fixed group 在 monorepo 中生成大量重复的 package changelog。

---

## 十三、配置项说明

### `repo`

GitHub 仓库名。

```ts
repo: 'baicie/zeus'
```

### `repositoryUrl`

写入 package.json 的 repository url。

```ts
repositoryUrl: 'https://github.com/baicie/zeus'
```

发布前会把 package.json 规范化为：

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/baicie/zeus",
    "directory": "packages/xxx"
  }
}
```

### `mode`

发布模式。

```ts
mode: 'changesets-fixed'
```

可选值：

```ts
'changesets-fixed'
'workspace-fixed'
```

### `workspace.roots`

需要扫描 package.json 的目录。

```ts
workspace: {
  roots: ['packages', 'integrations', 'create']
}
```

### `workspace.ignore`

忽略不参与 release 的包名或相对路径。

```ts
workspace: {
  ignore: ['@zeus-js/playground', 'examples/demo']
}
```

### `workspace.include`

只包含指定包名。

```ts
workspace: {
  include: ['@zeus-js/zeus', '@zeus-js/compiler']
}
```

### `workspace.publishable`

自定义是否可发布。

```ts
workspace: {
  publishable(pkg) {
    return pkg.name.startsWith('@zeus-js/')
  }
}
```

### `rootVersionPackage`

用哪个包的 version 作为共享版本来源。

```ts
rootVersionPackage: '@zeus-js/zeus'
```

### `rootPackageJson`

是否更新根 package.json version。

```ts
rootPackageJson: 'package.json'
```

关闭：

```ts
rootPackageJson: false
```

### `changelogFile`

统一 changelog 文件。

```ts
changelogFile: 'CHANGELOG.md'
```

关闭：

```ts
changelogFile: false
```

### `publish.access`

npm access。

```ts
publish: {
  access: 'public'
}
```

### `publish.provenance`

是否启用 npm provenance。

```ts
publish: {
  provenance: true
}
```

### `publish.skipExisting`

npm 已存在同版本时是否跳过。

```ts
publish: {
  skipExisting: true
}
```

推荐保持 `true`，这样补发时不会因为部分包已经发布而整体失败。

### `publish.retry`

发布重试次数。

```ts
publish: {
  retry: 5
}
```

### `precheck.commands`

发布前质量门禁。

```ts
precheck: {
  commands: [
    ['pnpm', 'typecheck'],
    ['pnpm', 'lint'],
    ['pnpm', 'test'],
    ['pnpm', 'build'],
  ],
}
```

### `afterVersion`

版本文件更新后的 hook。

```ts
afterVersion({ version, config }) {
  console.log(version)
}
```

注意：

- `versionPackages --dry` 不会执行 `afterVersion`；
- `changesets-fixed` 中 `afterVersion` 会在 package changelog 恢复之后执行；
- 如果 `afterVersion` 抛错，release 会失败。

---

## 十四、常见命令

### 正常稳定发版

```bash
pnpm release --version 0.1.0
```

### beta 发版

```bash
pnpm release --version 0.1.0-beta.0 --tag beta
```

### 只准备版本，不发布

```bash
pnpm release --version 0.1.0
```

### 准备并本地直接发布

```bash
pnpm release --version 0.1.0 --publish
```

### publishOnly 补发

```bash
pnpm release --publishOnly 0.1.0 --skipBuild
```

### publishOnly dry-run

```bash
pnpm release --publishOnly 0.1.0 --skipBuild --dry
```

### canary

```bash
pnpm release:canary
```

### 本地调试 canary

```bash
pnpm release:canary --force-local
```

---

## 十五、发版前检查清单

稳定版本发版前确认：

```bash
git status
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm release --version 0.1.0 --dry
```

确认 dry-run 无问题后：

```bash
pnpm release --version 0.1.0
git push --follow-tags
```

CI publish 失败后：

```bash
pnpm release --publishOnly 0.1.0 --skipBuild --dry
pnpm release --publishOnly 0.1.0 --skipBuild
```

---

## 十六、Zeus 推荐配置

Zeus 主仓库推荐：

```ts
import { defineReleaseConfig } from '@baicie/release'

export default defineReleaseConfig({
  repo: 'baicie/zeus',
  repositoryUrl: 'https://github.com/baicie/zeus',
  mode: 'changesets-fixed',
  packageManager: 'pnpm',

  workspace: {
    roots: ['packages', 'integrations', 'create', 'devtools'],
    publishable(pkg) {
      return pkg.name.startsWith('@zeus-js/')
    },
  },

  rootVersionPackage: '@zeus-js/zeus',
  changelogFile: 'CHANGELOG.md',

  changesets: {
    requireChangeset: false,
    readIgnore: true,
    readFixed: true,
    cleanupPackageChangelogs: true,
    unifiedChangelog: true,
  },

  publish: {
    access: 'public',
    provenance: true,
    skipExisting: true,
    retry: 5,
  },

  precheck: {
    commands: [
      ['pnpm', 'typecheck'],
      ['pnpm', 'lint'],
      ['pnpm', 'test'],
      ['pnpm', 'build'],
    ],
  },

  canary: {
    enabled: true,
    prefix: 'canary',
    tag: 'canary',
    envName: 'CANARY_VERSION',
    includeBranches: ['main', 'feat/**', 'fix/**', 'release/**', 'hotfix/**'],
    dispatch: {
      tokenEnv: 'ZEUS_UI_DISPATCH_TOKEN',
      repository: 'baicie/zeus-ui',
      eventType: 'zeus-canary-published',
    },
  },
})
```

---

## 十七、推荐测试

`@baicie/release` 自身建议至少覆盖：

```bash
pnpm --filter @baicie/release test
pnpm --filter @baicie/release typecheck
pnpm --filter @baicie/release build
```

关键测试场景：

- publish 参数解析；
- version dry-run 不执行 `afterVersion`；
- canary branch glob；
- package changelog snapshot；
- package changelog restore；
- `runChangesetsFixedVersion` 在 `changeset version` 失败时恢复；
- `runChangesetsFixedVersion` 在后续步骤失败时恢复；
- synthetic changeset 文件始终清理。

---

## 十八、故障处理

### npm 401

通常是 token 错误。

检查：

```bash
echo $NODE_AUTH_TOKEN
echo $NPM_TOKEN
```

GitHub Actions 中确认：

```yaml
env:
  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### npm provenance 失败

确认 workflow 有：

```yaml
permissions:
  id-token: write
```

同时 package repository 信息需要匹配真实 GitHub 仓库。

### npm 版本已存在

如果是补发，建议开启：

```ts
publish: {
  skipExisting: true
}
```

然后执行：

```bash
pnpm release --publishOnly 0.1.0 --skipBuild
```

### canary 没有触发下游

检查：

- `ZEUS_UI_DISPATCH_TOKEN` 是否存在；
- token 是否有目标仓库权限；
- `canary.dispatch.repository` 是否正确；
- 下游 workflow 是否监听了正确的 `repository_dispatch.types`。

### dry-run 后工作区有改动

这是正常行为。检查后还原：

```bash
git diff
git checkout -- .
```

---

## 十九、推荐实践

1. 稳定版本使用 tag 触发 CI publish；
2. 本地只负责生成版本、changelog、commit、tag；
3. canary 只在 CI 中真实发布；
4. `publish.skipExisting` 默认开启；
5. `publish.provenance` 默认开启；
6. `publishOnly` 只用于补发，不用于正常发版；
7. changesets-fixed 模式下只维护 root `CHANGELOG.md`；
8. 包级 `CHANGELOG.md` 如果原本存在，release 工具不会误删；
9. 每次修改 release 流程后必须跑 `@baicie/release` 测试；
10. Zeus 发版前必须先 dry-run。

---

## 二十、最小命令速查

```bash
# 稳定发版 dry-run
pnpm release --version 0.1.0 --dry

# 稳定发版
pnpm release --version 0.1.0

# beta
pnpm release --version 0.1.0-beta.0 --tag beta

# canary
pnpm release:canary

# canary 本地调试
pnpm release:canary --force-local

# publishOnly 补发 dry-run
pnpm release --publishOnly 0.1.0 --skipBuild --dry

# publishOnly 补发
pnpm release --publishOnly 0.1.0 --skipBuild
```
