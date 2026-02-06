import { useCallback, useEffect, useMemo, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  keymap,
} from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { lintGutter, linter } from '@codemirror/lint'
import { defaultKeymap } from '@codemirror/commands'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'

interface DiffLine {
  lineNumber: number
  type: 'unchanged' | 'added' | 'removed' | 'modified'
}

interface JsonCodeMirrorProps {
  value: string
  onChange?: (value: string) => void
  theme?: 'light' | 'dark'
  diffLines?: DiffLine[]
  height?: string
  scrollSync?: boolean
  syncedScroll?: number // 垂直百分比值 0-100
  syncedHorizontalScroll?: number // 横向像素值
  onScrollChange?: (scrollTop: number, scrollHeight: number) => void
  onHorizontalScrollChange?: (scrollLeft: number, scrollWidth: number) => void
}

export default function JsonCodeMirror({
  value,
  onChange,
  theme = 'light',
  diffLines,
  height = '100%',
  scrollSync = false,
  syncedScroll,
  syncedHorizontalScroll,
  onScrollChange,
  onHorizontalScrollChange,
}: JsonCodeMirrorProps) {
  const viewRef = useRef<EditorView>()
  const containerRef = useRef<HTMLDivElement>(null)

  // 主题配置
  const themeColors = useMemo(
    () => ({
      light: {
        addedBg: 'rgba(46, 160, 67, 0.1)',
        addedBorder: '#2ea043',
        removedBg: 'rgba(248, 81, 73, 0.1)',
        removedBorder: '#f85149',
        modifiedBg: 'rgba(187, 128, 9, 0.08)',
        modifiedBorder: '#bb8009',
        gutterBg: '#f8f9fa',
        gutterBorder: '#e1e4e8',
        gutterText: '#6e7681',
      },
      dark: {
        addedBg: 'rgba(46, 160, 67, 0.15)',
        addedBorder: '#2ea043',
        removedBg: 'rgba(248, 81, 73, 0.15)',
        removedBorder: '#f85149',
        modifiedBg: 'rgba(187, 128, 9, 0.12)',
        modifiedBorder: '#bb8009',
        gutterBg: '#1a1a2e',
        gutterBorder: '#30363d',
        gutterText: '#6e7681',
      },
    }),
    [],
  )

  const colors = themeColors[theme]
  const isReadOnly = !onChange

  // 创建装饰器
  const addedLineDecoration = Decoration.line({ class: 'cm-diff-added' })
  const removedLineDecoration = Decoration.line({ class: 'cm-diff-removed' })
  const modifiedLineDecoration = Decoration.line({ class: 'cm-diff-modified' })
  // 无差异行的透明装饰器（保持视觉一致性）
  const unchangedLineDecoration = Decoration.line({
    class: 'cm-diff-unchanged',
  })

  // 创建 ViewPlugin 来高亮 diff 行
  const diffHighlighter = useMemo(
    () =>
      ViewPlugin.fromClass(
        class {
          decorations: Array<Decoration>

          constructor(view: EditorView) {
            this.decorations = this.getDecorations(view)
          }

          update(update: ViewUpdate) {
            if (
              update.docChanged ||
              update.viewportChanged ||
              update.view.updatedDecorations
            ) {
              this.decorations = this.getDecorations(update.view)
            }
          }

          getDecorations(view: EditorView) {
            if (!diffLines) return []

            const builder: Array<Decoration> = []
            const totalLines = view.state.doc.lines

            diffLines.forEach(item => {
              // 添加边界检查：确保行号不超过文档总行数
              if (item.lineNumber < 1 || item.lineNumber > totalLines) {
                return
              }

              try {
                const lineInfo = view.state.doc.line(item.lineNumber)
                if (lineInfo) {
                  switch (item.type) {
                    case 'added':
                      builder.push(addedLineDecoration.range(lineInfo.from))
                      break
                    case 'removed':
                      builder.push(removedLineDecoration.range(lineInfo.from))
                      break
                    case 'modified':
                      builder.push(modifiedLineDecoration.range(lineInfo.from))
                      break
                    case 'unchanged':
                      // 无差异的行也添加透明装饰器，保持视觉一致性
                      builder.push(unchangedLineDecoration.range(lineInfo.from))
                      break
                  }
                }
              } catch {
                // 忽略无效行号
              }
            })

            return Decoration.set(builder.sort((a, b) => a.from - b.from))
          }
        },
        {
          decorations: v => v.decorations,
        },
      ),
    [diffLines, colors],
  )

  // 滚动处理
  const handleScroll = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement
      if (onScrollChange) {
        onScrollChange(target.scrollTop, target.scrollHeight)
      }
      if (onHorizontalScrollChange) {
        onHorizontalScrollChange(target.scrollLeft, target.scrollWidth)
      }
    },
    [onScrollChange, onHorizontalScrollChange],
  )

  // 同步滚动（使用百分比同步，适配不同行数的情况）
  useEffect(() => {
    if (!scrollSync || syncedScroll === undefined || !viewRef.current) return

    let animationFrameId: number

    const syncScroll = () => {
      const view = viewRef.current
      if (!view) return

      const scroller =
        view.scrollDOM || view.dom.querySelector('.cm-scroller') || view.dom

      if (scroller && scroller instanceof HTMLElement) {
        const scrollHeight = scroller.scrollHeight - scroller.clientHeight
        if (scrollHeight <= 0) return

        // syncedScroll 是 0-100 的百分比值
        const targetScroll = (syncedScroll / 100) * scrollHeight
        const currentScroll = scroller.scrollTop

        if (Math.abs(currentScroll - targetScroll) > 5) {
          scroller.scrollTop = targetScroll
        }
      }
    }

    animationFrameId = requestAnimationFrame(syncScroll)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [scrollSync, syncedScroll])

  // 同步横向滚动（使用像素值同步）
  useEffect(() => {
    if (!scrollSync || syncedHorizontalScroll === undefined || !viewRef.current)
      return

    let animationFrameId: number

    const syncHorizontalScroll = () => {
      const view = viewRef.current
      if (!view) return

      const scroller =
        view.scrollDOM || view.dom.querySelector('.cm-scroller') || view.dom

      if (scroller && scroller instanceof HTMLElement) {
        const currentScroll = scroller.scrollLeft

        if (Math.abs(currentScroll - syncedHorizontalScroll) > 2) {
          scroller.scrollLeft = syncedHorizontalScroll
        }
      }
    }

    animationFrameId = requestAnimationFrame(syncHorizontalScroll)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [scrollSync, syncedHorizontalScroll])

  // 基础扩展
  const baseExtensions = useMemo(
    () => [
      json(),
      linter(jsonParseLinter()),
      lintGutter(),
      keymap.of(defaultKeymap),
      EditorView.editable.of(!isReadOnly),
      EditorState.readOnly.of(isReadOnly),
      syntaxHighlighting(defaultHighlightStyle),
      EditorView.theme({
        '&': {
          height,
          fontSize: '13px',
          fontFamily:
            "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
          backgroundColor: 'transparent',
        },
        '.cm-scroller': {
          fontFamily:
            "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
          overflow: 'auto',
        },
        '.cm-content': {
          padding: '8px 12px',
          whiteSpace: 'pre',
        },
        '.cm-gutters': {
          backgroundColor: colors.gutterBg,
          color: colors.gutterText,
          borderRight: `1px solid ${colors.gutterBorder}`,
          position: 'sticky',
          left: 0,
          zIndex: 10,
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'transparent',
        },
      }),
    ],
    [theme, height, colors, isReadOnly],
  )

  // 完整的扩展（包含 diff 高亮）
  const extensions = useMemo(() => {
    return diffLines ? [...baseExtensions, diffHighlighter] : baseExtensions
  }, [baseExtensions, diffLines, diffHighlighter])

  // 更新内容
  const handleChange = useCallback(
    (val: string) => {
      if (onChange) {
        onChange(val)
      }
    },
    [onChange],
  )

  // 初始化或更新编辑器
  const handleCreate = useCallback(
    (editor: EditorView) => {
      viewRef.current = editor

      // 监听滚动事件
      const scroller = editor.scrollDOM
      if (scroller) {
        scroller.addEventListener('scroll', handleScroll)
      }
    },
    [handleScroll],
  )

  // 清理
  useEffect(() => {
    return () => {
      if (viewRef.current) {
        const scroller = viewRef.current.scrollDOM
        if (scroller) {
          scroller.removeEventListener('scroll', handleScroll)
        }
      }
    }
  }, [handleScroll])

  // 主题扩展
  const extensionTheme = useMemo(
    () =>
      EditorView.theme({
        '&': {
          backgroundColor: 'transparent',
        },
        '.cm-gutters': {
          backgroundColor: colors.gutterBg,
          color: colors.gutterText,
          borderRight: `1px solid ${colors.gutterBorder}`,
          position: 'sticky',
          left: 0,
          zIndex: 10,
        },
      }),
    [colors],
  )

  return (
    <>
      <style>{`
        .cm-diff-added {
          background-color: ${colors.addedBg};
          border-left: 3px solid ${colors.addedBorder};
        }
        .cm-diff-removed {
          background-color: ${colors.removedBg};
          border-left: 3px solid ${colors.removedBorder};
        }
        .cm-diff-modified {
          background-color: ${colors.modifiedBg};
          border-left: 3px solid ${colors.modifiedBorder};
        }
        /* 无差异行的透明标记（保持视觉一致性） */
        .cm-diff-unchanged {
          border-left: 3px solid transparent;
        }
      `}</style>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }}>
        <CodeMirror
          value={value}
          height={height}
          extensions={[...extensions, extensionTheme]}
          onChange={handleChange}
          theme={theme === 'dark' ? 'dark' : 'light'}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
          }}
          onCreate={handleCreate}
          style={{
            height: '100%',
            width: '100%',
            backgroundColor: 'transparent',
          }}
        />
      </div>
    </>
  )
}
