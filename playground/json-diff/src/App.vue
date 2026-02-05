<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { jsonDiff, getJsonDiffDetails } from '@baicie/napi-browser'

// ==================== 类型定义 ====================

interface RenderToken {
  text: string
  kind: 'key' | 'value' | 'punctuation'
  diff?: 'added' | 'removed' | 'modified'
}

interface RenderLine {
  no: number
  indent: number
  tokens: RenderToken[]
}

interface DiffItem {
  path: string
  operation: 'add' | 'remove' | 'replace'
  oldValue?: any
  newValue?: any
}

// ==================== 原始 JSON ====================

const oldJson = ref(`{
  "name": "用户管理",
  "version": "1.0.0",
  "enabled": true,
  "maxUsers": 100,
  "permissions": ["read", "write"],
  "config": {
    "timeout": 30,
    "retries": 3
  }
}`)

const newJson = ref(`{
  "name": "用户管理",
  "version": "1.1.0",
  "enabled": false,
  "maxUsers": 200,
  "permissions": ["read", "write", "delete"],
  "config": {
    "timeout": 60,
    "retries": 5,
    "debug": true
  }
}`)

// ==================== 差异数据 ====================

const diffItems = ref<DiffItem[]>([])
const errorMessage = ref('')
const isLoading = ref(false)
const viewMode = ref<'split' | 'unified'>('split')

// ==================== Diff Map ====================

const diffMap = computed(() => {
  const map: Record<string, 'added' | 'removed' | 'modified'> = {}
  for (const item of diffItems.value) {
    if (item.operation === 'add') {
      map[item.path] = 'added'
    } else if (item.operation === 'remove') {
      map[item.path] = 'removed'
    } else if (item.operation === 'replace') {
      map[item.path] = 'modified'
    }
  }
  // 调试：打印 diffMap
  console.log('DiffMap:', map)
  return map
})

// ==================== JSON → 行 ====================

function jsonToLines(jsonStr: string): string[] {
  try {
    const obj = JSON.parse(jsonStr)
    return JSON.stringify(obj, null, 2).split('\n')
  } catch {
    return jsonStr.split('\n')
  }
}

// ==================== 行 → Token ====================

function tokenizeLine(line: string): RenderToken[] {
  const tokens: RenderToken[] = []

  // 缩进
  const indentMatch = line.match(/^\s*/)
  const indent = indentMatch ? indentMatch[0] : ''
  if (indent) {
    tokens.push({ text: indent, kind: 'punctuation' })
  }

  const content = line.trim()

  if (!content) return tokens

  // Key-Value 行
  const keyMatch = content.match(/^"([^"]+)":/)
  if (keyMatch) {
    tokens.push({ text: `"${keyMatch[1]}"`, kind: 'key' })
    tokens.push({ text: ': ', kind: 'punctuation' })

    const value = content.slice(keyMatch[0].length)
    tokens.push({ text: value, kind: 'value' })
  } else {
    // 纯值 / 结构符号
    tokens.push({ text: content, kind: 'value' })
  }

  return tokens
}

// ==================== 构建渲染行 ====================

function buildRenderLines(
  lines: string[],
  diffMap: Record<string, 'added' | 'removed' | 'modified'>,
  isOld: boolean
): RenderLine[] {
  const renderLines: RenderLine[] = []
  const pathStack: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const tokens = tokenizeLine(line)
    const indent = line.match(/^\s*/)?.[0].length || 0

    // 更新路径栈
    const keyMatch = line.trim().match(/^"([^"]+)":/)

    if (keyMatch) {
      const keyPart = keyMatch[1]

      // 调整路径栈深度
      while (pathStack.length > 0 && (pathStack[pathStack.length - 1]?.length || 0) >= indent) {
        pathStack.pop()
      }

      // 构建完整路径
      const fullPath = pathStack.length > 0
        ? `${pathStack.join('')}${keyPart}`
        : keyPart

      pathStack.push(fullPath + '.')

      // 调试：打印当前路径
      console.log(`  -> CurrentPath: ${fullPath}, DiffMap has:`, diffMap[fullPath])
    }

    // 获取当前路径
    const currentPath = pathStack.length > 0
      ? pathStack[pathStack.length - 1].replace(/\.$/, '')
      : ''

    // 应用差异到 tokens
    const appliedTokens = tokens.map(token => {
      if (token.kind === 'value') {
        const diffType = diffMap[currentPath]
        if (diffType) {
          // 旧 JSON 中：remove 和 modify 应该标记
          if (isOld && (diffType === 'removed' || diffType === 'modified')) {
            return { ...token, diff: diffType === 'removed' ? 'removed' : 'modified' }
          }
          // 新 JSON 中：add 和 modify 应该标记
          if (!isOld && (diffType === 'added' || diffType === 'modified')) {
            return { ...token, diff: diffType === 'added' ? 'added' : 'modified' }
          }
        }
      }
      return token
    })

    renderLines.push({
      no: i + 1,
      indent: indent / 2,
      tokens: appliedTokens
    })
  }

  return renderLines
}

// ==================== 计算差异 ====================

const handleDiff = async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''

    // 验证 JSON 格式
    try {
      JSON.parse(oldJson.value)
      JSON.parse(newJson.value)
    } catch {
      throw new Error('JSON 格式错误，请检查输入')
    }

    // 计算差异
    const diffDetails = getJsonDiffDetails(oldJson.value, newJson.value)
    diffItems.value = JSON.parse(diffDetails)

    // 调试：打印差异详情
    console.log('Diff Items:', JSON.stringify(diffItems.value, null, 2))
  } catch (error) {
    errorMessage.value = `错误: ${error}`
    console.error('JSON diff error:', error)
  } finally {
    isLoading.value = false
  }
}

// ==================== 渲染数据 ====================

const oldRenderLines = computed(() => {
  const lines = jsonToLines(oldJson.value)
  return buildRenderLines(lines, diffMap.value, true)
})

const newRenderLines = computed(() => {
  const lines = jsonToLines(newJson.value)
  return buildRenderLines(lines, diffMap.value, false)
})

// ==================== 统一视图行 ====================

const unifiedRenderLines = computed(() => {
  const oldLines = jsonToLines(oldJson.value)
  const newLines = jsonToLines(newJson.value)
  const maxLen = Math.max(oldLines.length, newLines.length)

  const result: Array<{ type: 'same' | 'old' | 'new' | 'both', line: RenderLine | null }> = []

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i] || ''
    const newLine = newLines[i] || ''

    const oldTokens = tokenizeLine(oldLine)
    const newTokens = tokenizeLine(newLine)

    // 比较是否相同
    const isSame = oldLine === newLine

    if (isSame) {
      result.push({
        type: 'same',
        line: {
          no: i + 1,
          indent: (oldLine.match(/^\s*/)?.[0].length || 0) / 2,
          tokens: oldTokens
        }
      })
    } else {
      result.push({
        type: 'old',
        line: oldLine ? {
          no: i + 1,
          indent: (oldLine.match(/^\s*/)?.[0].length || 0) / 2,
          tokens: oldTokens.map(t => ({ ...t, diff: 'removed' }))
        } : null
      })
      result.push({
        type: 'new',
        line: newLine ? {
          no: i + 1,
          indent: (newLine.match(/^\s*/)?.[0].length || 0) / 2,
          tokens: newTokens.map(t => ({ ...t, diff: 'added' }))
        } : null
      })
    }
  }

  return result
})

// ==================== 工具函数 ====================

const formatJson = (jsonStr: string) => {
  try {
    const parsed = JSON.parse(jsonStr)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return jsonStr
  }
}

const compressJson = (jsonStr: string) => {
  try {
    const parsed = JSON.parse(jsonStr)
    return JSON.stringify(parsed)
  } catch {
    return jsonStr
  }
}

const swapJson = () => {
  const temp = oldJson.value
  oldJson.value = newJson.value
  newJson.value = temp
  diffItems.value = []
}

const clearAll = () => {
  oldJson.value = ''
  newJson.value = ''
  diffItems.value = []
  errorMessage.value = ''
}

const copyResult = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  } catch {
    alert('复制失败')
  }
}

// ==================== 测试用例 ====================

const testCases = [
  {
    name: '简单对象对比',
    old: '{"name": "张三", "age": 25}',
    new: '{"name": "张三", "age": 30}'
  },
  {
    name: '添加删除属性',
    old: '{"a": 1, "b": 2, "c": 3}',
    new: '{"a": 1, "d": 4, "c": 3}'
  },
  {
    name: '嵌套对象',
    old: '{"user": {"name": "李四", "info": {"age": 20}}}',
    new: '{"user": {"name": "李四", "info": {"age": 25, "city": "北京"}}}'
  },
  {
    name: '数组对比',
    old: '{"tags": ["a", "b", "c"]}',
    new: '{"tags": ["a", "b", "d", "e"]}'
  }
]

const loadTestCase = (testCase: typeof testCases[0]) => {
  oldJson.value = testCase.old
  newJson.value = testCase.new
  diffItems.value = []
  errorMessage.value = ''
}

// ==================== 统计 ====================

const diffStats = computed(() => {
  return {
    total: diffItems.value.length,
    added: diffItems.value.filter(d => d.operation === 'add').length,
    removed: diffItems.value.filter(d => d.operation === 'remove').length,
    modified: diffItems.value.filter(d => d.operation === 'replace').length
  }
})
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <h1>JSON Diff 差异化渲染</h1>
        <p>基于 Token 的差异高亮显示</p>
      </div>
      <div class="stats" v-if="diffItems.length > 0">
        <span class="stat-item total">总计: {{ diffStats.total }}</span>
        <span class="stat-item added">新增: {{ diffStats.added }}</span>
        <span class="stat-item removed">删除: {{ diffStats.removed }}</span>
        <span class="stat-item modified">修改: {{ diffStats.modified }}</span>
      </div>
    </header>

    <main class="main">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="test-cases">
          <span>快速测试:</span>
          <button
            v-for="testCase in testCases"
            :key="testCase.name"
            @click="loadTestCase(testCase)"
            class="test-btn"
          >
            {{ testCase.name }}
          </button>
        </div>
        <div class="actions">
          <button @click="swapJson" class="action-btn" title="交换左右">
            交换
          </button>
          <button @click="clearAll" class="action-btn" title="清空">
            清空
          </button>
          <button @click="handleDiff" class="action-btn primary" :disabled="isLoading">
            {{ isLoading ? '计算中...' : '开始对比' }}
          </button>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <!-- 分裂视图 -->
      <div v-if="diffItems.length > 0 && viewMode === 'split'" class="diff-container">
        <div class="diff-legend">
          <div class="legend-item">
            <span class="dot added"></span>
            <span>新增</span>
          </div>
          <div class="legend-item">
            <span class="dot removed"></span>
            <span>删除</span>
          </div>
          <div class="legend-item">
            <span class="dot modified"></span>
            <span>修改</span>
          </div>
        </div>

        <div class="split-view">
          <!-- 旧 JSON -->
          <div class="split-panel old">
            <div class="panel-header">
              <h3>原始 JSON (Old)</h3>
              <div class="panel-actions">
                <button @click="oldJson = formatJson(oldJson)" class="small-btn">格式化</button>
                <button @click="copyResult(oldJson)" class="small-btn">复制</button>
              </div>
            </div>
            <div class="code-area">
              <div
                v-for="line in oldRenderLines"
                :key="line.no"
                class="code-line"
              >
                <span class="line-no">{{ String(line.no).padStart(3, ' ') }}</span>
                <span class="line-content">
                  <span
                    v-for="(token, idx) in line.tokens"
                    :key="idx"
                    :class="['token', token.kind, token.diff]"
                  >{{ token.text }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- 新 JSON -->
          <div class="split-panel new">
            <div class="panel-header">
              <h3>新 JSON (New)</h3>
              <div class="panel-actions">
                <button @click="newJson = formatJson(newJson)" class="small-btn">格式化</button>
                <button @click="copyResult(newJson)" class="small-btn">复制</button>
              </div>
            </div>
            <div class="code-area">
              <div
                v-for="line in newRenderLines"
                :key="line.no"
                class="code-line"
              >
                <span class="line-no">{{ String(line.no).padStart(3, ' ') }}</span>
                <span class="line-content">
                  <span
                    v-for="(token, idx) in line.tokens"
                    :key="idx"
                    :class="['token', token.kind, token.diff]"
                  >{{ token.text }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 统一视图 -->
      <div v-else-if="diffItems.length > 0 && viewMode === 'unified'" class="diff-container">
        <div class="diff-legend">
          <div class="legend-item">
            <span class="dot added"></span>
            <span>新增</span>
          </div>
          <div class="legend-item">
            <span class="dot removed"></span>
            <span>删除</span>
          </div>
          <div class="legend-item">
            <span class="dot modified"></span>
            <span>修改</span>
          </div>
        </div>

        <div class="unified-view">
          <div class="panel-header">
            <h3>统一视图 (Unified Diff)</h3>
          </div>
          <div class="code-area">
            <template v-for="(item, idx) in unifiedRenderLines" :key="idx">
              <div
                v-if="item.line"
                :class="['code-line', item.type]"
              >
                <span class="line-prefix">{{ item.type === 'old' ? '-' : item.type === 'new' ? '+' : ' ' }}</span>
                <span class="line-no">{{ String(item.line.no).padStart(3, ' ') }}</span>
                <span class="line-content">
                  <span
                    v-for="(token, tIdx) in item.line.tokens"
                    :key="tIdx"
                    :class="['token', token.kind, token.diff]"
                  >{{ token.text }}</span>
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- JSON 输入区域 -->
      <div v-if="!diffItems.length" class="editor-container">
        <div class="editor-panel">
          <div class="panel-header old">
            <h3>原始 JSON</h3>
            <div class="panel-actions">
              <button @click="oldJson = formatJson(oldJson)" class="small-btn">格式化</button>
              <button @click="oldJson = compressJson(oldJson)" class="small-btn">压缩</button>
            </div>
          </div>
          <textarea
            v-model="oldJson"
            class="json-editor"
            placeholder="请输入原始 JSON..."
            spellcheck="false"
          ></textarea>
        </div>

        <div class="editor-panel">
          <div class="panel-header new">
            <h3>新 JSON</h3>
            <div class="panel-actions">
              <button @click="newJson = formatJson(newJson)" class="small-btn">格式化</button>
              <button @click="newJson = compressJson(newJson)" class="small-btn">压缩</button>
            </div>
          </div>
          <textarea
            v-model="newJson"
            class="json-editor"
            placeholder="请输入新 JSON..."
            spellcheck="false"
          ></textarea>
        </div>
      </div>

      <!-- 无差异提示 -->
      <div v-if="!diffItems.length && !errorMessage" class="no-result">
        <p>输入两个 JSON，点击"开始对比"查看差异</p>
      </div>
    </main>

    <footer class="footer">
      <p>Powered by @baicie/napi + Rust</p>
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}
</style>

<style scoped>
.app {
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 20px;
  color: white;
}

.header h1 {
  font-size: 28px;
  margin-bottom: 8px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.header p {
  opacity: 0.9;
  font-size: 14px;
}

.stats {
  margin-top: 15px;
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.stat-item {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
}

.stat-item.added {
  background: rgba(40, 167, 69, 0.8);
}

.stat-item.removed {
  background: rgba(220, 53, 69, 0.8);
}

.stat-item.modified {
  background: rgba(255, 193, 7, 0.8);
}

.main {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;
  gap: 15px;
}

.test-cases {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.test-cases span {
  font-size: 13px;
  color: #666;
}

.test-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: #f8f9fa;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.test-btn:hover {
  background: #e9ecef;
  border-color: #ced4da;
}

.actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f8f9fa;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.action-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  padding: 12px 16px;
  color: #721c24;
  margin-bottom: 20px;
}

.editor-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.editor-panel {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #dee2e6;
}

.panel-header.old {
  background: #fff3cd;
}

.panel-header.new {
  background: #d4edda;
}

.panel-header h3 {
  font-size: 14px;
  color: #495057;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.small-btn {
  padding: 4px 10px;
  border: 1px solid #ced4da;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.small-btn:hover {
  background: #e9ecef;
}

.json-editor {
  width: 100%;
  height: 400px;
  padding: 15px;
  border: none;
  background: #f8f9fa;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
}

.json-editor:focus {
  background: white;
}

.diff-container {
  margin-bottom: 20px;
}

.diff-legend {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  padding: 10px 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.added {
  background: #28a745;
}

.dot.removed {
  background: #dc3545;
}

.dot.modified {
  background: #ffc107;
}

/* 代码区域样式 */
.split-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.split-panel {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.split-panel.old .panel-header {
  background: #fff3cd;
}

.split-panel.new .panel-header {
  background: #d4edda;
}

.unified-view {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.code-area {
  padding: 10px 0;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.code-line {
  display: flex;
  align-items: flex-start;
  padding: 2px 0;
}

.code-line:hover {
  background: rgba(0, 0, 0, 0.03);
}

.line-prefix {
  width: 20px;
  text-align: center;
  color: #999;
  user-select: none;
  flex-shrink: 0;
}

.line-no {
  width: 50px;
  text-align: right;
  padding-right: 15px;
  color: #999;
  user-select: none;
  flex-shrink: 0;
}

.line-content {
  flex: 1;
  white-space: pre;
}

/* Token 样式 */
.token {
  display: inline;
}

.token.key {
  color: #0b4ddb;
}

.token.value {
  color: #24292f;
}

.token.punctuation {
  color: #6f42c1;
}

/* 差异高亮 */
.token.added {
  background: #e6ffed;
  color: #22863a;
}

.token.removed {
  background: #ffeef0;
  color: #cb2431;
  text-decoration: line-through;
}

.token.modified {
  background: #fff5b1;
  color: #6a737d;
}

/* 统一视图特殊样式 */
.unified-view .code-line.old {
  background: #ffeef0;
}

.unified-view .code-line.new {
  background: #e6ffed;
}

.unified-view .code-line.same {
  background: transparent;
}

.no-result {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.footer {
  text-align: center;
  margin-top: 30px;
  color: white;
  font-size: 13px;
}

.footer a {
  color: white;
  text-decoration: underline;
}

@media (max-width: 768px) {
  .editor-container,
  .split-view {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats {
    flex-wrap: wrap;
  }
}
</style>
