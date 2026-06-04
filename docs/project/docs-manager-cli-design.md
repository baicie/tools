# Docs Manager CLI 设计方案

## 1. 背景

在使用 AI 参与研发的过程中，项目会持续产生大量文档，例如：

- 最终目标与产品愿景
- Roadmap 与阶段计划
- 每个阶段的大致设计
- 每个阶段的详细设计
- Bug 记录、Review 记录、决策记录
- 版本迭代文档，例如 v1、v2、v3
- 临时讨论、Prompt 记录、验收记录、复盘记录

如果这些文档只靠人工命名和目录约定维护，后期会出现几个典型问题：

- 文档散落，难以知道“当前阶段到底看哪份”
- 版本之间重复内容过多，更新成本变高
- AI 生成的临时文档和正式文档混在一起
- Roadmap、设计、Bug、Review、验收之间缺少关联
- 很难快速生成某个阶段或版本的上下文给 AI 使用

因此需要一个结构化的 Docs Manager CLI，用于初始化、创建、索引、归档、查询和导出项目文档。

## 2. 目标

Docs Manager CLI 的目标不是替代文档本身，而是提供一套轻量、可追踪、适合 AI 协作的文档治理方式。

核心目标：

- 建立稳定的文档目录结构
- 让每份文档都有明确类型、阶段、版本和状态
- 降低版本迭代中的重复文档
- 支持快速生成 AI 所需上下文
- 支持 Roadmap、阶段设计、Bug、Review、决策之间的关联
- 尽量保持 Markdown 优先，避免过早引入数据库

非目标：

- 不做完整知识库系统
- 不做复杂权限管理
- 不强制替代现有 `docs/` 文档站内容
- 不把所有 AI 对话逐字保存为正式文档

## 3. 核心原则

### 3.1 Markdown 优先

所有正式文档默认使用 Markdown。CLI 负责生成模板、维护索引和校验结构，而不是把文档锁进私有格式。

### 3.2 元数据轻量化

每份受管理文档使用 frontmatter 描述元数据：

```yaml
---
id: phase-auth-design
title: Auth Phase Detailed Design
type: detailed-design
version: v1
phase: phase-01-auth
status: draft
owners:
  - core
related:
  - roadmap-v1
  - bug-auth-token-expire
createdAt: 2026-06-04
updatedAt: 2026-06-04
---
```

### 3.3 稳定内容不重复

版本文档不应该机械复制全部内容。稳定不变的目标、架构原则、通用约束应放在全局层；版本层只记录该版本的范围、变化、取舍和阶段计划。

### 3.4 临时文档和正式文档分离

AI 生成的草稿、讨论记录、Prompt 片段可以先进入 inbox 或 drafts。只有经过整理后才进入 roadmap、design、decision 等正式目录。

### 3.5 文档之间显式关联

Bug 应能关联到阶段、设计和 Review；Review 应能关联到 PR、阶段和修复记录；决策应能关联到被影响的设计文档。

## 4. 推荐目录结构

推荐在仓库根目录下使用 `docs/project/` 承载项目治理文档，与现有包文档、API 文档分离。

```text
docs/
  project/
    index.md
    manifest.json
    goals/
      final-goal.md
      constraints.md
      principles.md
    roadmap/
      roadmap.md
      v1.md
      v2.md
    versions/
      v1/
        index.md
        scope.md
        release-notes.md
      v2/
        index.md
        scope.md
        release-notes.md
    phases/
      phase-01-auth/
        overview.md
        design.md
        detailed-design.md
        acceptance.md
      phase-02-dashboard/
        overview.md
        design.md
        detailed-design.md
        acceptance.md
    records/
      bugs/
        bug-auth-token-expire.md
      reviews/
        review-pr-123.md
      decisions/
        adr-0001-docs-manager-cli.md
      retrospectives/
        retro-v1.md
    ai/
      inbox/
      drafts/
      context/
```

目录职责：

- `goals/`：长期目标、边界、原则，不跟随版本重复
- `roadmap/`：跨版本和版本级路线图
- `versions/`：版本范围、发布目标、发布说明
- `phases/`：阶段设计和阶段验收
- `records/`：Bug、Review、ADR、复盘等事件型文档
- `ai/`：AI 协作产生的临时材料和上下文包
- `manifest.json`：CLI 维护的索引文件

## 5. 版本内容是否重复

结论：不要在每个版本中重复全部文档，只在版本中引用和覆盖。

推荐分层：

| 层级          | 内容                         | 是否按版本重复                               |
| ------------- | ---------------------------- | -------------------------------------------- |
| 全局目标      | 最终目标、项目原则、长期约束 | 不重复                                       |
| Roadmap       | 总路线图、版本计划           | 总路线图不重复，版本计划单独维护             |
| 阶段设计      | 某阶段的设计与验收           | 不按版本复制，通过 `version` 和 `phase` 关联 |
| 版本范围      | v1/v2 的目标、取舍、交付范围 | 每个版本单独维护                             |
| Bug/Review    | 具体问题和审查记录           | 不复制，通过关联指向版本和阶段               |
| Release Notes | 对外发布变化                 | 每个版本单独维护                             |

示例：

```text
goals/final-goal.md
roadmap/roadmap.md
versions/v1/scope.md
phases/phase-01-auth/detailed-design.md
records/bugs/bug-auth-token-expire.md
```

`versions/v1/scope.md` 不复制 `final-goal.md`，而是引用：

```markdown
## References

- Final goal: ../goals/final-goal.md
- Roadmap: ../roadmap/roadmap.md
- Phase: ../phases/phase-01-auth/overview.md
```

如果 v2 对 v1 的设计有变化，应新建变更说明或决策记录，而不是直接复制 v1 全量设计：

```text
records/decisions/adr-0007-change-auth-session-policy.md
```

## 6. 文档类型

建议第一版支持以下文档类型：

| type              | 用途                           |
| ----------------- | ------------------------------ |
| `goal`            | 最终目标、原则、约束           |
| `roadmap`         | 总路线图或版本路线图           |
| `version`         | 版本范围、发布目标、发布说明   |
| `phase-overview`  | 阶段概览                       |
| `design`          | 阶段大致设计                   |
| `detailed-design` | 阶段详细设计                   |
| `acceptance`      | 阶段验收标准                   |
| `bug`             | Bug 记录                       |
| `review`          | Code Review 或设计 Review 记录 |
| `decision`        | ADR 或关键决策                 |
| `retro`           | 复盘                           |
| `ai-draft`        | AI 草稿                        |
| `ai-context`      | 给 AI 使用的上下文包           |

## 7. CLI 方案选择

### 7.1 推荐：先内嵌在当前 CLI 中

当前仓库已经存在 `@baicie/cli`，并且 `bca` 已经使用子命令组织能力，例如：

```bash
bca pkg
```

因此第一阶段推荐新增：

```bash
bca docs
```

原因：

- 当前功能与项目工具链强相关，适合作为现有 CLI 的一部分
- 可以复用 `packages/cli` 的命令注册、日志、交互能力
- 发布和使用成本更低
- 第一版还在探索阶段，没必要过早拆包
- 后续可以平滑抽离为独立包

### 7.2 何时独立成 CLI

当出现以下情况时，再拆成独立 CLI：

- 需要跨多个无关仓库使用
- 命令数量明显增长，例如超过 15 个
- 需要独立发布节奏
- 需要独立配置、插件、模板市场
- Docs Manager 逐渐成为单独产品

届时可以拆成：

```text
packages/docs-manager/
packages/cli/
```

`@baicie/cli` 保留代理命令：

```bash
bca docs ...
```

独立包提供二进制：

```bash
bcdocs ...
```

## 8. 命令设计

第一版命令建议保持克制，只覆盖初始化、创建、列表、校验、导出。

### 8.1 初始化

```bash
bca docs init
```

生成基础目录：

```text
docs/project/
  index.md
  manifest.json
  goals/
  roadmap/
  versions/
  phases/
  records/
  ai/
```

可选参数：

```bash
bca docs init --root docs/project
bca docs init --force
```

### 8.2 创建文档

```bash
bca docs new <type>
```

示例：

```bash
bca docs new goal --title "Final Goal"
bca docs new roadmap --doc-version v1
bca docs new phase --name phase-01-auth --doc-version v1
bca docs new design --phase phase-01-auth
bca docs new bug --title "token expire error" --phase phase-01-auth --doc-version v1
bca docs new review --title "PR 123 review" --phase phase-01-auth
bca docs new decision --title "use markdown frontmatter"
```

### 8.3 列表和查询

```bash
bca docs list
bca docs list --type bug
bca docs list --doc-version v1
bca docs list --phase phase-01-auth
bca docs show phase-01-auth
```

### 8.4 校验

```bash
bca docs check
```

校验内容：

- `manifest.json` 是否存在
- frontmatter 必填字段是否存在
- `related` 引用是否有效
- `version` 是否存在
- `phase` 是否存在
- 是否存在重复 `id`
- AI 草稿是否长期未整理

### 8.5 生成 AI 上下文

```bash
bca docs context --doc-version v1
bca docs context --phase phase-01-auth
bca docs context --bug bug-auth-token-expire
```

输出到：

```text
docs/project/ai/context/phase-01-auth.md
```

上下文包应包含：

- 全局目标摘要
- 当前版本范围
- 当前阶段概览
- 相关设计文档
- 相关 Bug 和 Review
- 已确认决策
- 待确认问题

### 8.6 归档 AI 草稿

```bash
bca docs inbox
bca docs promote <draft-id> --type design --phase phase-01-auth
```

`promote` 的职责是把 `ai/inbox` 或 `ai/drafts` 中的文档转成正式文档，并补齐 frontmatter。

## 9. manifest.json 设计

`manifest.json` 是 CLI 的索引文件，用于加快查询和校验。

```json
{
  "schemaVersion": 1,
  "root": "docs/project",
  "versions": [
    {
      "id": "v1",
      "title": "Version 1",
      "status": "active"
    }
  ],
  "phases": [
    {
      "id": "phase-01-auth",
      "title": "Auth",
      "version": "v1",
      "status": "active"
    }
  ],
  "documents": [
    {
      "id": "phase-auth-detailed-design",
      "title": "Auth Detailed Design",
      "type": "detailed-design",
      "path": "phases/phase-01-auth/detailed-design.md",
      "version": "v1",
      "phase": "phase-01-auth",
      "status": "draft"
    }
  ]
}
```

CLI 可以通过扫描 Markdown 重建 manifest：

```bash
bca docs reindex
```

## 10. 模板设计

### 10.1 Goal 模板

```markdown
# {{title}}

## Final Goal

## Non Goals

## Constraints

## Principles

## Success Criteria
```

### 10.2 Roadmap 模板

```markdown
# {{title}}

## Overview

## Milestones

## Versions

## Risks

## Open Questions
```

### 10.3 Phase Design 模板

```markdown
# {{title}}

## Context

## Goals

## Proposed Design

## Alternatives

## Risks

## Acceptance Criteria

## Related Documents
```

### 10.4 Bug 模板

```markdown
# {{title}}

## Summary

## Impact

## Steps To Reproduce

## Expected

## Actual

## Root Cause

## Fix Plan

## Verification

## Related Documents
```

### 10.5 Review 模板

```markdown
# {{title}}

## Scope

## Findings

## Required Changes

## Follow Ups

## Result

## Related Documents
```

### 10.6 Decision 模板

```markdown
# {{title}}

## Status

## Context

## Decision

## Consequences

## Alternatives

## Related Documents
```

## 11. 实现建议

第一版建议放在当前 CLI：

```text
packages/cli/src/docs/
  index.ts
  commands.ts
  manifest.ts
  templates.ts
  frontmatter.ts
  path.ts
  types.ts
```

职责划分：

- `commands.ts`：注册 `bca docs` 子命令
- `manifest.ts`：读写和重建索引
- `templates.ts`：维护模板
- `frontmatter.ts`：解析和生成 frontmatter
- `path.ts`：生成目标路径
- `types.ts`：公共类型定义

依赖建议：

- 第一版可手写简单 frontmatter 生成
- 如果要解析 Markdown frontmatter，建议使用 `gray-matter`
- 文件扫描可使用 `fast-glob`
- 文件读写复用当前 CLI 已有工具函数

注意：项目编译目标要求避免 `async/await`、可选链和空值合并。实现时应使用 Promise 链或现有代码风格逐步统一。

## 12. 迭代路线

### v0.1：结构初始化

- `bca docs init`
- 生成目录和基础模板
- 生成 `manifest.json`

### v0.2：文档创建

- `bca docs new`
- 支持 goal、roadmap、version、phase、design、bug、review、decision
- 自动写入 frontmatter

### v0.3：索引和校验

- `bca docs list`
- `bca docs check`
- `bca docs reindex`

### v0.4：AI 上下文

- `bca docs context`
- 按 version、phase、bug 聚合上下文

### v0.5：草稿治理

- `bca docs inbox`
- `bca docs promote`
- 支持将 AI 草稿转成正式文档

### v1.0：稳定发布

- 完整测试覆盖
- 文档站补充
- 支持配置文件
- 确认是否需要拆成独立 CLI

## 13. 推荐结论

短期建议：内嵌到当前 `@baicie/cli`，新增 `bca docs` 子命令。

长期策略：当 Docs Manager 的能力从“项目内文档治理”演进为“跨项目文档产品”时，再抽成独立包。

版本文档策略：不要在 v1、v2 中重复所有内容。全局稳定内容只维护一份，版本只描述范围、变化和取舍；阶段设计、Bug、Review、ADR 通过元数据和引用关联到版本。

这样既能让文档结构清晰，又不会把版本迭代变成复制粘贴地狱。
