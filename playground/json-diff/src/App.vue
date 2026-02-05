<script setup lang="ts">
import { ref, computed } from 'vue'
import { jsonDiff, getJsonDiffDetails, applyJsonDiff } from '@baicie/napi-browser'

// 原始JSON
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

// 新JSON
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

// 差异结果
const diffResult = ref('')
const diffDetails = ref('')
const appliedResult = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

// 同步滚动
const syncScroll = (source: Event, target: HTMLElement) => {
  const e = source as InputEvent
  const targetInput = e.target as HTMLInputElement
  if (targetInput) {
    const percentage = targetInput.scrollTop / (targetInput.scrollHeight - targetInput.clientHeight)
    const targetElement = document.getElementById(target)
    if (targetElement) {
      targetElement.scrollTop = percentage * (targetElement.scrollHeight - targetElement.clientHeight)
    }
  }
}

// 计算差异
const handleDiff = async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''

    // 验证JSON格式
    try {
      JSON.parse(oldJson.value)
      JSON.parse(newJson.value)
    } catch (e) {
      throw new Error('JSON 格式错误，请检查输入')
    }

    // 计算差异
    diffResult.value = jsonDiff(oldJson.value, newJson.value)
    diffDetails.value = getJsonDiffDetails(oldJson.value, newJson.value)

    // 演示应用差异
    appliedResult.value = applyJsonDiff(oldJson.value, diffResult.value)
  } catch (error) {
    errorMessage.value = `错误: ${error}`
    console.error('JSON diff error:', error)
  } finally {
    isLoading.value = false
  }
}

// 格式化JSON
const formatJson = (jsonStr: string) => {
  try {
    const parsed = JSON.parse(jsonStr)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return jsonStr
  }
}

// 压缩JSON
const compressJson = (jsonStr: string) => {
  try {
    const parsed = JSON.parse(jsonStr)
    return JSON.stringify(parsed)
  } catch {
    return jsonStr
  }
}

// 交换JSON
const swapJson = () => {
  const temp = oldJson.value
  oldJson.value = newJson.value
  newJson.value = temp
  diffResult.value = ''
  diffDetails.value = ''
  appliedResult.value = ''
}

// 清空
const clearAll = () => {
  oldJson.value = ''
  newJson.value = ''
  diffResult.value = ''
  diffDetails.value = ''
  appliedResult.value = ''
  errorMessage.value = ''
}

// 复制结果
const copyResult = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  } catch {
    alert('复制失败')
  }
}

// 预设测试用例
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
  diffResult.value = ''
  diffDetails.value = ''
  appliedResult.value = ''
  errorMessage.value = ''
}

// 解析差异详情用于显示
const parsedDiffDetails = computed(() => {
  try {
    return JSON.parse(diffDetails.value)
  } catch {
    return []
  }
})

// 解析应用结果用于显示
const parsedAppliedResult = computed(() => {
  try {
    return JSON.parse(appliedResult.value)
  } catch {
    return null
  }
})

// 获取差异统计
const diffStats = computed(() => {
  try {
    const details = JSON.parse(diffDetails.value)
    return {
      total: details.length,
      added: details.filter((d: any) => d.operation === 'add').length,
      removed: details.filter((d: any) => d.operation === 'remove').length,
      modified: details.filter((d: any) => d.operation === 'replace').length
    }
  } catch {
    return { total: 0, added: 0, removed: 0, modified: 0 }
  }
})
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <h1>🔍 JSON Diff 在线对比工具</h1>
        <p>快速比较两个 JSON 字符串的差异</p>
      </div>
      <div class="stats" v-if="diffStats.total > 0">
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
            🔄 交换
          </button>
          <button @click="clearAll" class="action-btn" title="清空">
            🗑️ 清空
          </button>
          <button @click="handleDiff" class="action-btn primary" :disabled="isLoading">
            {{ isLoading ? '计算中...' : '🚀 开始对比' }}
          </button>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="errorMessage" class="error-message">
        ❌ {{ errorMessage }}
      </div>

      <!-- JSON 输入区域 -->
      <div class="editor-container">
        <div class="editor-panel">
          <div class="panel-header">
            <h3>📝 原始 JSON</h3>
            <div class="panel-actions">
              <button @click="oldJson = formatJson(oldJson)" class="small-btn">格式化</button>
              <button @click="oldJson = compressJson(oldJson)" class="small-btn">压缩</button>
            </div>
          </div>
          <textarea
            id="old-editor"
            v-model="oldJson"
            class="json-editor"
            placeholder="请输入原始 JSON..."
            spellcheck="false"
          ></textarea>
        </div>

        <div class="editor-panel">
          <div class="panel-header">
            <h3>✨ 新 JSON</h3>
            <div class="panel-actions">
              <button @click="newJson = formatJson(newJson)" class="small-btn">格式化</button>
              <button @click="newJson = compressJson(newJson)" class="small-btn">压缩</button>
            </div>
          </div>
          <textarea
            id="new-editor"
            v-model="newJson"
            class="json-editor"
            placeholder="请输入新 JSON..."
            spellcheck="false"
          ></textarea>
        </div>
      </div>

      <!-- 差异对比 -->
      <div v-if="diffResult" class="diff-container">
        <!-- 差异操作列表 -->
        <div class="diff-panel">
          <div class="panel-header">
            <h3>📊 差异操作详情</h3>
            <button @click="copyResult(diffDetails)" class="small-btn">复制</button>
          </div>
          <div class="diff-list">
            <div v-if="parsedDiffDetails.length === 0" class="no-diff">
              两个 JSON 完全相同，没有差异 ✅
            </div>
            <div
              v-for="(item, index) in parsedDiffDetails"
              :key="index"
              :class="['diff-item', item.operation]"
            >
              <div class="diff-op">
                <span class="op-icon">{{ item.operation === 'add' ? '+' : item.operation === 'remove' ? '-' : '~' }}</span>
                <span class="op-path">{{ item.path }}</span>
              </div>
              <div class="diff-values" v-if="item.oldValue !== undefined || item.newValue !== undefined">
                <span class="old-val">{{ JSON.stringify(item.oldValue) }}</span>
                <span class="arrow">→</span>
                <span class="new-val">{{ JSON.stringify(item.newValue) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- JSON 结构可视化 -->
        <div class="visual-panel">
          <div class="panel-header">
            <h3>📐 差异 JSON (树形结构)</h3>
            <button @click="copyResult(diffResult)" class="small-btn">复制</button>
          </div>
          <pre class="json-preview">{{ diffResult }}</pre>
        </div>

        <!-- 应用结果 -->
        <div class="result-panel" v-if="parsedAppliedResult">
          <div class="panel-header">
            <h3>✅ 应用差异后的结果</h3>
            <button @click="copyResult(appliedResult)" class="small-btn">复制</button>
          </div>
          <pre class="json-preview">{{ appliedResult }}</pre>
        </div>
      </div>

      <!-- 无差异提示 -->
      <div v-else-if="!errorMessage" class="no-result">
        <p>👆 点击"开始对比"按钮，查看两个 JSON 的差异</p>
      </div>
    </main>

    <footer class="footer">
      <p>Powered by <a href="https://github.com/baicie/tools" target="_blank">@baicie/napi</a> + Rust</p>
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
  background: #e9ecef;
  border-bottom: 1px solid #dee2e6;
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
  height: 300px;
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
  display: grid;
  gap: 20px;
}

.diff-panel {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.diff-list {
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
}

.no-diff {
  text-align: center;
  padding: 30px;
  color: #28a745;
  font-size: 14px;
}

.diff-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border-left: 4px solid #ddd;
  background: white;
}

.diff-item.add {
  border-left-color: #28a745;
  background: #d4edda;
}

.diff-item.remove {
  border-left-color: #dc3545;
  background: #f8d7da;
}

.diff-item.replace {
  border-left-color: #ffc107;
  background: #fff3cd;
}

.diff-op {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.op-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-weight: bold;
  font-size: 16px;
}

.add .op-icon {
  background: #28a745;
  color: white;
}

.remove .op-icon {
  background: #dc3545;
  color: white;
}

.replace .op-icon {
  background: #ffc107;
  color: #333;
}

.op-path {
  font-family: monospace;
  font-size: 13px;
  color: #333;
}

.diff-values {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 34px;
  font-family: monospace;
  font-size: 12px;
}

.old-val {
  color: #dc3545;
  text-decoration: line-through;
}

.arrow {
  color: #999;
}

.new-val {
  color: #28a745;
}

.visual-panel,
.result-panel {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.json-preview {
  padding: 15px;
  max-height: 300px;
  overflow: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
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
  .editor-container {
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

