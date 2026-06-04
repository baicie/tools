import type { DocsDocumentType, DocsFrontmatter } from './types'

export function createDocumentContent(frontmatter: DocsFrontmatter): string {
  return `${stringifyFrontmatter(frontmatter)}
# ${frontmatter.title}

${getTemplateBody(frontmatter.type)}
`
}

export function stringifyFrontmatter(frontmatter: DocsFrontmatter): string {
  const lines = [
    '---',
    `id: ${frontmatter.id}`,
    `title: ${frontmatter.title}`,
    `type: ${frontmatter.type}`,
    `status: ${frontmatter.status}`,
  ]

  if (frontmatter.version) lines.push(`version: ${frontmatter.version}`)
  if (frontmatter.phase) lines.push(`phase: ${frontmatter.phase}`)

  lines.push('related: []')
  lines.push(`createdAt: ${frontmatter.createdAt}`)
  lines.push(`updatedAt: ${frontmatter.updatedAt}`)
  lines.push('---')

  return `${lines.join('\n')}\n`
}

export function getTemplateBody(type: DocsDocumentType): string {
  if (type === 'goal') {
    return `## Final Goal

## Non Goals

## Constraints

## Principles

## Success Criteria
`
  }

  if (type === 'roadmap') {
    return `## Overview

## Milestones

## Versions

## Risks

## Open Questions
`
  }

  if (type === 'version') {
    return `## Scope

## Goals

## Changes

## Phases

## Release Notes
`
  }

  if (
    type === 'phase-overview' ||
    type === 'design' ||
    type === 'detailed-design' ||
    type === 'acceptance'
  ) {
    return `## Context

## Goals

## Proposed Design

## Alternatives

## Risks

## Acceptance Criteria

## Related Documents
`
  }

  if (type === 'bug') {
    return `## Summary

## Impact

## Steps To Reproduce

## Expected

## Actual

## Root Cause

## Fix Plan

## Verification

## Related Documents
`
  }

  if (type === 'review') {
    return `## Scope

## Findings

## Required Changes

## Follow Ups

## Result

## Related Documents
`
  }

  if (type === 'decision') {
    return `## Status

## Context

## Decision

## Consequences

## Alternatives

## Related Documents
`
  }

  if (type === 'retro') {
    return `## Summary

## What Worked

## What Did Not Work

## Follow Ups
`
  }

  return `## Context

## Content

## Related Documents
`
}
