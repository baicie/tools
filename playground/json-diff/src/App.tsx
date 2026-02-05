import { useEffect, useMemo, useState } from 'react'
import Button from './components/button'
import Switch from './components/switch'
import JsonEditor from './components/JsonEditor'
import { getJsonDiffDetails } from '@baicie/napi-browser'

type Theme = 'light' | 'dark'

interface DiffItem {
  path: string
  operation: 'add' | 'remove' | 'replace'
  oldValue?: unknown
  newValue?: unknown
}

function initTheme(): Theme {
  const saved =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('json-diff-theme')
      : null
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  return (saved as Theme | null) || (prefersDark ? 'dark' : 'light')
}

function setTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
  try {
    localStorage.setItem('json-diff-theme', theme)
  } catch {}
}

function formatJsonText(text: string): string {
  try {
    const obj = JSON.parse(text)
    return JSON.stringify(obj, null, 2)
  } catch {
    return text
  }
}

// 开发模式下使用的测试 JSON 数据
const DEV_SAMPLE_OLD_JSON = JSON.stringify(
  {
    name: '张三',
    age: 28,
    email: 'zhangsan@example.com',
    hobbies: ['读书', '游泳', '编程'],
    address: {
      city: '北京',
      district: '朝阳区',
    },
    skills: ['JavaScript', 'TypeScript', 'React'],
  },
  null,
  2,
)

const DEV_SAMPLE_NEW_JSON = JSON.stringify(
  {
    name: '张三',
    age: 30,
    email: 'zhangsan@example.com',
    hobbies: ['读书', '游泳', '骑行'],
    address: {
      city: '上海',
      district: '浦东新区',
    },
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
    nickname: '三三',
  },
  null,
  2,
)

function compressJsonText(text: string): string {
  try {
    const obj = JSON.parse(text)
    return JSON.stringify(obj)
  } catch {
    return text
  }
}

function getLineTokens(line: string): Array<{ type: string; value: string }> {
  const tokens: Array<{ type: string; value: string }> = []
  let i = 0

  while (i < line.length) {
    const char = line[i]

    // 空白字符
    if (/\s/.test(char)) {
      let whitespace = ''
      while (i < line.length && /\s/.test(line[i])) {
        whitespace += line[i]
        i++
      }
      tokens.push({ type: 'whitespace', value: whitespace })
      continue
    }

    // 字符串
    if (char === '"') {
      let str = ''
      i++
      while (i < line.length && line[i] !== '"') {
        if (line[i] === '\\' && i + 1 < line.length) {
          str += line[i] + line[i + 1]
          i += 2
        } else {
          str += line[i]
          i++
        }
      }
      str += '"'
      i++

      const lastToken = tokens[tokens.length - 1]
      if (lastToken && lastToken.value === ':') {
        tokens.push({ type: 'string', value: str })
      } else {
        tokens.push({ type: 'key', value: str })
      }
      continue
    }

    // 数字
    if (/[\d-]/.test(char)) {
      let num = ''
      while (i < line.length && /[\d.eE+-]/.test(line[i])) {
        num += line[i]
        i++
      }
      tokens.push({ type: 'number', value: num })
      continue
    }

    // 布尔值和 null
    if (line.slice(i, i + 4) === 'true') {
      tokens.push({ type: 'boolean', value: 'true' })
      i += 4
      continue
    }
    if (line.slice(i, i + 5) === 'false') {
      tokens.push({ type: 'boolean', value: 'false' })
      i += 5
      continue
    }
    if (line.slice(i, i + 4) === 'null') {
      tokens.push({ type: 'null', value: 'null' })
      i += 4
      continue
    }

    // 标点符号
    if ('{}[]:,'.includes(char)) {
      tokens.push({ type: 'punctuation', value: char })
      i++
      continue
    }

    tokens.push({ type: 'text', value: char })
    i++
  }

  return tokens
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderLine(
  tokens: Array<{ type: string; value: string }>,
  highlightKeys: Set<string>,
  highlightColor: string,
): string {
  return tokens
    .map(token => {
      const escaped = escapeHtml(token.value)

      // 高亮 key
      if (token.type === 'key') {
        const keyName = token.value.replace(/"/g, '')
        if (highlightKeys.has(keyName)) {
          return `<span class="diff-key" style="background-color: ${highlightColor}; border-radius: 3px; padding: 0 2px;">${escaped}</span>`
        }
        return `<span class="token-key">${escaped}</span>`
      }

      // 高亮值（如果是 highlight key 的值）
      if (
        token.type === 'string' ||
        token.type === 'number' ||
        token.type === 'boolean' ||
        token.type === 'null'
      ) {
        const prevToken = tokens[tokens.indexOf(token) - 1]
        if (
          prevToken &&
          prevToken.type === 'key' &&
          highlightKeys.has(prevToken.value.replace(/"/g, ''))
        ) {
          return `<span class="diff-value" style="background-color: ${highlightColor}; border-radius: 3px; padding: 0 2px;">${escaped}</span>`
        }
      }

      switch (token.type) {
        case 'string':
          return `<span class="token-string">${escaped}</span>`
        case 'number':
          return `<span class="token-number">${escaped}</span>`
        case 'boolean':
          return `<span class="token-boolean">${escaped}</span>`
        case 'null':
          return `<span class="token-null">${escaped}</span>`
        case 'punctuation':
          return `<span class="token-punctuation">${escaped}</span>`
        default:
          return escaped
      }
    })
    .join('')
}

export default function App() {
  const [theme, setThemeState] = useState<Theme>('light')

  // 初始化 JSON 数据
  const [oldJson, setOldJson] = useState<string>(() => {
    const saved = localStorage.getItem('json-diff-old')
    if (saved) {
      return saved
    }
    return DEV_SAMPLE_OLD_JSON
  })

  const [newJson, setNewJson] = useState<string>(() => {
    const saved = localStorage.getItem('json-diff-new')
    if (saved) {
      return saved
    }
    return DEV_SAMPLE_NEW_JSON
  })

  const [diffItems, setDiffItems] = useState<DiffItem[]>([])
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'edit' | 'diff'>('diff')

  useEffect(() => {
    const t = initTheme()
    setThemeState(t)
    setTheme(t)
  }, [])

  // 持久化
  useEffect(() => {
    localStorage.setItem('json-diff-old', oldJson)
  }, [oldJson])

  useEffect(() => {
    localStorage.setItem('json-diff-new', newJson)
  }, [newJson])

  useEffect(() => {
    const trimmedOld = oldJson.trim()
    const trimmedNew = newJson.trim()
    if (!trimmedOld || !trimmedNew) {
      setDiffItems([])
      setErrorMessage('')
      return
    }
    const timer = setTimeout(() => {
      try {
        setIsLoading(true)
        JSON.parse(trimmedOld)
        JSON.parse(trimmedNew)
        const details = getJsonDiffDetails(trimmedOld, trimmedNew)
        const items = JSON.parse(details) as DiffItem[]
        setDiffItems(items)
        setErrorMessage('')
      } catch (e) {
        setErrorMessage('JSON 格式错误')
        setDiffItems([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [oldJson, newJson])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setThemeState(next)
    setTheme(next)
  }

  function swapJson() {
    const temp = oldJson
    setOldJson(newJson)
    setNewJson(temp)
    setDiffItems([])
    setErrorMessage('')
  }

  function clearAll() {
    setOldJson('')
    setNewJson('')
    setDiffItems([])
    setErrorMessage('')
    localStorage.removeItem('json-diff-old')
    localStorage.removeItem('json-diff-new')
  }

  function copyText(text: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text)
      }
    } catch {}
  }

  // 处理 JSON 行
  const oldLines = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(oldJson), null, 2).split('\n')
    } catch {
      return oldJson.split('\n')
    }
  }, [oldJson])

  const newLines = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(newJson), null, 2).split('\n')
    } catch {
      return newJson.split('\n')
    }
  }, [newJson])

  const maxLines = Math.max(oldLines.length, newLines.length)

  // 根据 diffItems 生成每行的高亮 key
  const oldHighlights = useMemo(() => {
    const highlights: Array<Set<string>> = Array.from(
      { length: maxLines },
      () => new Set<string>(),
    )

    diffItems.forEach(item => {
      const parts = item.path.split('.').filter(p => p && !/^\d+$/.test(p))
      const lastKey = parts[parts.length - 1]

      // 在旧 JSON 中查找
      for (let i = 0; i < oldLines.length; i++) {
        if (oldLines[i].includes(`"${lastKey}"`)) {
          highlights[i].add(lastKey)
          // 也高亮父级
          if (parts.length > 1) {
            for (let j = i - 1; j >= 0; j--) {
              const parentMatch = oldLines[j].match(/"([^"]+)"\s*:/)
              if (parentMatch && parts.includes(parentMatch[1])) {
                highlights[j].add(parentMatch[1])
              } else {
                break
              }
            }
          }
          break
        }
      }
    })

    return highlights
  }, [diffItems, oldLines])

  const newHighlights = useMemo(() => {
    const highlights: Array<Set<string>> = Array.from(
      { length: maxLines },
      () => new Set<string>(),
    )

    diffItems.forEach(item => {
      const parts = item.path.split('.').filter(p => p && !/^\d+$/.test(p))
      const lastKey = parts[parts.length - 1]

      // 在新 JSON 中查找
      for (let i = 0; i < newLines.length; i++) {
        if (newLines[i].includes(`"${lastKey}"`)) {
          highlights[i].add(lastKey)
          // 也高亮父级
          if (parts.length > 1) {
            for (let j = i - 1; j >= 0; j--) {
              const parentMatch = newLines[j].match(/"([^"]+)"\s*:/)
              if (parentMatch && parts.includes(parentMatch[1])) {
                highlights[j].add(parentMatch[1])
              } else {
                break
              }
            }
          }
          break
        }
      }
    })

    return highlights
  }, [diffItems, newLines])

  // 确定行的类型
  const lineTypes = useMemo(() => {
    const types: Array<'unchanged' | 'added' | 'removed' | 'modified'> = []

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || ''
      const newLine = newLines[i] || ''

      const oldTrimmed = oldLine.trim()
      const newTrimmed = newLine.trim()

      if (!oldTrimmed && !newTrimmed) {
        types.push('unchanged')
      } else if (!oldTrimmed && newTrimmed) {
        types.push('added')
      } else if (oldTrimmed && !newTrimmed) {
        types.push('removed')
      } else {
        // 检查是否有关联的 diff
        const hasOldDiff = oldHighlights[i].size > 0
        const hasNewDiff = newHighlights[i].size > 0

        if (hasOldDiff || hasNewDiff) {
          types.push('modified')
        } else {
          // 检查值是否相同
          const oldColonIndex = oldLine.indexOf(':')
          const newColonIndex = newLine.indexOf(':')

          if (oldColonIndex !== -1 && newColonIndex !== -1) {
            const oldValue = oldLine.slice(oldColonIndex + 1).trim()
            const newValue = newLine.slice(newColonIndex + 1).trim()

            if (oldValue !== newValue) {
              types.push('modified')
            } else {
              types.push('unchanged')
            }
          } else {
            types.push('unchanged')
          }
        }
      }
    }

    return types
  }, [oldLines, newLines, oldHighlights, newHighlights])

  // 解析 token 缓存
  const oldTokens = useMemo(() => oldLines.map(getLineTokens), [oldLines])
  const newTokens = useMemo(() => newLines.map(getLineTokens), [newLines])

  const isOldJsonValid = useMemo(() => {
    try {
      oldJson.trim() && JSON.parse(oldJson.trim())
      return true
    } catch {
      return false
    }
  }, [oldJson])

  const isNewJsonValid = useMemo(() => {
    try {
      newJson.trim() && JSON.parse(newJson.trim())
      return true
    } catch {
      return false
    }
  }, [newJson])

  return (
    <div className="app-container">
      <style>{`
        .app-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: var(--theme-bg-canvas);
        }

        /* 头部 */
        .header {
          flex-shrink: 0;
          background-color: var(--theme-bg-surface);
          border-bottom: 1px solid var(--theme-border);
        }

        .header-content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 6px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--theme-bg-primary), var(--theme-bg-secondary));
        }

        .logo svg {
          width: 18px;
          height: 18px;
          color: white;
        }

        .title {
          font-size: 14px;
          font-weight: 600;
          color: var(--theme-text-primary);
        }

        .header-center {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 500;
        }

        .badge-sample {
          background-color: var(--theme-bg-muted);
          color: var(--theme-text-muted);
        }

        .badge-error {
          background-color: var(--theme-diff-removed-bg);
          color: var(--theme-diff-removed-text);
        }

        .badge-success {
          background-color: var(--theme-diff-added-bg);
          color: var(--theme-diff-added-text);
        }

        .badge-loading {
          color: var(--theme-text-secondary);
        }

        .spinner {
          width: 14px;
          height: 14px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .theme-toggle {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 1px 4px;
          border-radius: 3px;
          background-color: var(--theme-bg-muted);
        }

        .theme-toggle svg {
          width: 12px;
          height: 12px;
        }

        /* 主内容区 */
        .main {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .diff-container {
          flex: 1;
          display: flex;
          overflow: hidden;
          border-top: 1px solid var(--theme-border);
        }

        .diff-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .column-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          border-bottom: 1px solid var(--theme-border);
          flex-shrink: 0;
        }

        .column-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--theme-text-primary);
        }

        .column-actions {
          display: flex;
          gap: 4px;
        }

        .btn-small {
          padding: 4px 8px;
          font-size: 11px;
          border-radius: 4px;
        }

        .column-content {
          flex: 1;
          overflow: auto;
          position: relative;
        }

        .diff-line {
          display: flex;
          min-height: 26px;
        }

        .line-number {
          min-width: 44px;
          padding: 0 8px;
          text-align: right;
          color: #6e7681;
          background: var(--theme-bg-panel-header);
          user-select: none;
          border-right: 1px solid var(--theme-border);
          flex-shrink: 0;
        }

        .line-content {
          flex: 1;
          padding: 0 12px;
          white-space: pre-wrap;
          word-break: break-all;
          overflow-wrap: break-word;
          min-width: 0;
        }

        /* 行类型样式 */
        .diff-added {
          background-color: rgba(46, 160, 67, 0.1);
        }

        .diff-added .line-content {
          border-left: 3px solid #2ea043;
        }

        .diff-removed {
          background-color: rgba(248, 81, 73, 0.1);
        }

        .diff-removed .line-content {
          border-left: 3px solid #f85149;
        }

        .diff-modified {
          background-color: rgba(187, 128, 9, 0.08);
        }

        .diff-modified .line-content {
          border-left: 3px solid #bb8009;
        }

        .diff-unchanged {
          background-color: transparent;
        }

        /* 语法高亮 */
        .token-key {
          color: #79c0ff;
        }

        .token-string {
          color: #a5d6ff;
        }

        .token-number {
          color: #79c0ff;
        }

        .token-boolean {
          color: #ff7b72;
        }

        .token-null {
          color: #ff7b72;
        }

        .token-punctuation {
          color: #8b949e;
        }

        /* 差异高亮 */
        .diff-key {
          color: #d29922;
          font-weight: 500;
        }

        .diff-value {
          color: #d29922;
          font-weight: 500;
        }
      `}</style>

      {/* 头部 */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="title">JSON Diff</h1>
          </div>

          <div className="header-center">
            <Button
              onClick={() => setViewMode(viewMode === 'edit' ? 'diff' : 'edit')}
              variant={viewMode === 'edit' ? 'primary' : 'secondary'}
              className="btn-small"
            >
              {viewMode === 'edit' ? '查看对比' : '编辑 JSON'}
            </Button>
            {oldJson === DEV_SAMPLE_OLD_JSON &&
              newJson === DEV_SAMPLE_NEW_JSON &&
              diffItems.length > 0 && (
                <span className="badge badge-sample">示例数据</span>
              )}
            {errorMessage && (
              <span className="badge badge-error">{errorMessage}</span>
            )}
            {isLoading && (
              <span className="badge badge-loading">
                <svg className="spinner" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    opacity="0.25"
                  />
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    opacity="0.75"
                  />
                </svg>
                计算中...
              </span>
            )}
            {diffItems.length > 0 && !errorMessage && (
              <span className="badge badge-success">
                {diffItems.length} 处差异
              </span>
            )}
          </div>

          <div className="header-right">
            <Button
              onClick={swapJson}
              variant="secondary"
              className="btn-small"
            >
              <svg
                style={{ width: 14, height: 14, marginRight: 4 }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              交换
            </Button>
            <Button onClick={clearAll} variant="danger" className="btn-small">
              <svg
                style={{ width: 14, height: 14, marginRight: 4 }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              清空
            </Button>
            <div className="theme-toggle">
              <svg
                fill="currentColor"
                viewBox="0 0 20 20"
                style={{
                  color:
                    theme === 'light'
                      ? 'var(--theme-text-primary)'
                      : 'var(--theme-text-muted)',
                }}
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-3.791l-.168-.527-.877.439a1 1 0 00-.554 1.83l.622.933a1 1 0 01.286 1.052l-1.178 4.686a3.99 3.99 0 01-3.691 3.1H8a1 1 0 01-1-1v-2.924a3.99 3.99 5-2.0 01.07L4.5 12.5l-.422-.211A1 1 0 003 13.05a1 1 0 00-.5 1.79l.8 1.511a1 1 0 01.285 1.05l-1.178 4.686a3.99 3.99 0 01-3.691 3.1H2a1 1 0 01-1-1V5a1 1 0 011-1h7.5z"
                  clipRule="evenodd"
                />
              </svg>
              <Switch checked={theme === 'dark'} onChange={toggleTheme} />
              <svg
                fill="currentColor"
                viewBox="0 0 20 20"
                style={{
                  color:
                    theme === 'dark'
                      ? 'var(--theme-text-primary)'
                      : 'var(--theme-text-muted)',
                }}
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="main">
        {viewMode === 'edit' ? (
          // 编辑模式
          <div className="diff-container">
            {/* 左侧 - 旧 JSON */}
            <div className="diff-column">
              <div
                className="column-header"
                style={{ backgroundColor: 'var(--theme-panel-old-bg)' }}
              >
                <span className="column-title">原始 JSON</span>
                <div className="column-actions">
                  <Button
                    onClick={() => setOldJson(formatJsonText(oldJson))}
                    variant="secondary"
                    className="btn-small"
                  >
                    格式化
                  </Button>
                  <Button
                    onClick={() => copyText(oldJson)}
                    variant="secondary"
                    className="btn-small"
                  >
                    复制
                  </Button>
                  <Button
                    onClick={() => setOldJson(compressJsonText(oldJson))}
                    variant="secondary"
                    className="btn-small"
                  >
                    压缩
                  </Button>
                </div>
              </div>
              <div className="column-content" style={{ overflow: 'hidden' }}>
                <JsonEditor
                  value={oldJson}
                  onChange={setOldJson}
                  theme={theme}
                />
              </div>
            </div>

            {/* 右侧 - 新 JSON */}
            <div className="diff-column">
              <div
                className="column-header"
                style={{ backgroundColor: 'var(--theme-panel-new-bg)' }}
              >
                <span className="column-title">新 JSON</span>
                <div className="column-actions">
                  <Button
                    onClick={() => setNewJson(formatJsonText(newJson))}
                    variant="secondary"
                    className="btn-small"
                  >
                    格式化
                  </Button>
                  <Button
                    onClick={() => copyText(newJson)}
                    variant="secondary"
                    className="btn-small"
                  >
                    复制
                  </Button>
                  <Button
                    onClick={() => setNewJson(compressJsonText(newJson))}
                    variant="secondary"
                    className="btn-small"
                  >
                    压缩
                  </Button>
                </div>
              </div>
              <div className="column-content" style={{ overflow: 'hidden' }}>
                <JsonEditor
                  value={newJson}
                  onChange={setNewJson}
                  theme={theme}
                />
              </div>
            </div>
          </div>
        ) : (
          // 对比模式
          <div className="diff-container">
            {/* 左侧 - 旧 JSON */}
            <div className="diff-column">
              <div
                className="column-header"
                style={{
                  backgroundColor: 'var(--theme-panel-old-bg)',
                  borderBottomColor: 'var(--theme-border)',
                }}
              >
                <span className="column-title">原始 JSON</span>
                <div className="column-actions">
                  <Button
                    onClick={() => setOldJson(formatJsonText(oldJson))}
                    variant="secondary"
                    className="btn-small"
                  >
                    格式化
                  </Button>
                  <Button
                    onClick={() => copyText(oldJson)}
                    variant="secondary"
                    className="btn-small"
                  >
                    复制
                  </Button>
                  <Button
                    onClick={() => setOldJson(compressJsonText(oldJson))}
                    variant="secondary"
                    className="btn-small"
                  >
                    压缩
                  </Button>
                </div>
              </div>
              <div className="column-content">
                {oldLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`diff-line diff-${lineTypes[idx] || 'unchanged'}`}
                  >
                    <div className="line-number">{idx + 1}</div>
                    <div
                      className="line-content"
                      dangerouslySetInnerHTML={{
                        __html: renderLine(
                          oldTokens[idx],
                          oldHighlights[idx],
                          'rgba(187, 128, 9, 0.25)',
                        ),
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧 - 新 JSON */}
            <div className="diff-column">
              <div
                className="column-header"
                style={{
                  backgroundColor: 'var(--theme-panel-new-bg)',
                  borderBottomColor: 'var(--theme-border)',
                }}
              >
                <span className="column-title">新 JSON</span>
                <div className="column-actions">
                  <Button
                    onClick={() => setNewJson(formatJsonText(newJson))}
                    variant="secondary"
                    className="btn-small"
                  >
                    格式化
                  </Button>
                  <Button
                    onClick={() => copyText(newJson)}
                    variant="secondary"
                    className="btn-small"
                  >
                    复制
                  </Button>
                  <Button
                    onClick={() => setNewJson(compressJsonText(newJson))}
                    variant="secondary"
                    className="btn-small"
                  >
                    压缩
                  </Button>
                </div>
              </div>
              <div className="column-content">
                {newLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`diff-line diff-${lineTypes[idx] || 'unchanged'}`}
                  >
                    <div className="line-number">{idx + 1}</div>
                    <div
                      className="line-content"
                      dangerouslySetInnerHTML={{
                        __html: renderLine(
                          newTokens[idx],
                          newHighlights[idx],
                          'rgba(16, 185, 129, 0.2)',
                        ),
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
