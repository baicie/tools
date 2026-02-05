import CodeMirror from '@uiw/react-codemirror'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { lintGutter, linter } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  theme?: 'light' | 'dark'
  height?: string
}

export default function JsonEditor({
  value,
  onChange,
  theme,
  height = '100%',
}: JsonEditorProps) {
  const extensions = [
    json(),
    linter(jsonParseLinter()),
    lintGutter(),
    EditorView.lineWrapping,
    EditorView.theme({
      '&': {
        height,
        fontSize: '13px',
        fontFamily:
          "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
      },
      '.cm-scroller': {
        fontFamily:
          "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
      },
      '.cm-content': {
        padding: '8px 12px',
      },
      '.cm-gutters': {
        backgroundColor: theme === 'dark' ? '#1a1a2e' : '#f8f9fa',
        color: theme === 'dark' ? '#6c757d' : '#6c757d',
        borderRight: '1px solid var(--theme-border)',
      },
    }),
  ]

  return (
    <CodeMirror
      value={value}
      height={height}
      extensions={extensions}
      onChange={onChange}
      theme={theme === 'dark' ? 'dark' : 'light'}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
      style={{
        height: '100%',
        backgroundColor: 'transparent',
      }}
    />
  )
}
