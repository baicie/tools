<script setup lang="ts">
import { plus100, jsonDiff, applyJsonDiff } from '@baicie/napi-browser'
import { ref } from 'vue'
import JsonDiffVisualizer from './components/JsonDiffVisualizer.vue'

// 原始plus100测试
const plusResult = ref(0)

const handlePlusClick = () => {
  try {
    plusResult.value = plus100(100)
    console.log('Plus 100 result:', plusResult.value)
  } catch (error) {
    console.error('Plus 100 error:', error)
  }
}

// JSON Diff测试
const oldJson = ref(`{
  "name": "Alice",
  "age": 25,
  "address": {
    "city": "Beijing",
    "country": "China"
  }
}`)

const newJson = ref(`{
  "name": "Alice",
  "age": 26,
  "address": {
    "city": "Shanghai",
    "country": "China"
  },
  "job": "Engineer"
}`)

const diffResult = ref('')
const appliedResult = ref('')
const errorMessage = ref('')

const handleJsonDiff = () => {
  try {
    errorMessage.value = ''
    const diff = jsonDiff(oldJson.value, newJson.value)
    diffResult.value = diff

    // 格式化显示
    const operations = JSON.parse(diff)
    console.log('JSON diff operations:', operations)

    // 同时演示应用差异
    const applied = applyJsonDiff(oldJson.value, diff)
    appliedResult.value = applied

    console.log('Applied result:', JSON.parse(applied))
  } catch (error) {
    errorMessage.value = `JSON diff error: ${error}`
    console.error('JSON diff error:', error)
  }
}

const handleApplyDiff = () => {
  try {
    errorMessage.value = ''
    const applied = applyJsonDiff(oldJson.value, diffResult.value)
    appliedResult.value = applied
    console.log('Applied result:', JSON.parse(applied))
  } catch (error) {
    errorMessage.value = `Apply diff error: ${error}`
    console.error('Apply diff error:', error)
  }
}

// 预设测试用例
const testCases = [
  {
    name: '基础属性修改',
    old: '{"name": "Alice", "age": 25}',
    new: '{"name": "Alice", "age": 26}',
  },
  {
    name: '添加新属性',
    old: '{"name": "Bob"}',
    new: '{"name": "Bob", "age": 30, "city": "New York"}',
  },
  {
    name: '删除属性',
    old: '{"name": "Charlie", "age": 35, "city": "London"}',
    new: '{"name": "Charlie"}',
  },
  {
    name: '嵌套对象',
    old: '{"user": {"name": "David", "profile": {"age": 28}}}',
    new: '{"user": {"name": "David", "profile": {"age": 29, "city": "Tokyo"}}}',
  },
]

const loadTestCase = (testCase: (typeof testCases)[0]) => {
  oldJson.value = testCase.old
  newJson.value = testCase.new
  diffResult.value = ''
  appliedResult.value = ''
  errorMessage.value = ''
}
</script>

<template>
  <div class="app">
    <header>
      <h1>NAPI + Vue 3 测试页面</h1>
      <p>测试 Rust 原生绑定功能</p>
    </header>

    <main>
      <!-- 原始plus100测试 -->
      <section class="test-section">
        <h2>🔢 Plus 100 测试</h2>
        <div class="test-content">
          <button @click="handlePlusClick" class="test-button">
            plus100(100)
          </button>
          <div v-if="plusResult" class="result">结果: {{ plusResult }}</div>
        </div>
      </section>

      <!-- JSON Diff测试 -->
      <section class="test-section">
        <h2>📊 JSON Diff 测试</h2>

        <!-- 预设测试用例 -->
        <div class="test-cases">
          <h3>快速测试用例:</h3>
          <div class="test-buttons">
            <button
              v-for="testCase in testCases"
              :key="testCase.name"
              @click="loadTestCase(testCase)"
              class="test-case-button"
            >
              {{ testCase.name }}
            </button>
          </div>
        </div>

        <!-- JSON输入 -->
        <div class="json-inputs">
          <div class="json-input">
            <h3>原始 JSON</h3>
            <textarea
              v-model="oldJson"
              placeholder="输入原始 JSON"
              class="json-textarea"
            ></textarea>
          </div>
          <div class="json-input">
            <h3>新 JSON</h3>
            <textarea
              v-model="newJson"
              placeholder="输入新 JSON"
              class="json-textarea"
            ></textarea>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="actions">
          <button @click="handleJsonDiff" class="test-button primary">
            🔍 计算差异
          </button>
          <button
            v-if="diffResult"
            @click="handleApplyDiff"
            class="test-button secondary"
          >
            ✨ 应用差异
          </button>
        </div>

        <!-- 错误信息 -->
        <div v-if="errorMessage" class="error">❌ {{ errorMessage }}</div>

        <!-- JSON差异可视化 -->
        <JsonDiffVisualizer :original-json="oldJson" :new-json="newJson" />

        <!-- 原始结果显示（隐藏） -->
        <div v-if="false && diffResult" class="results">
          <div class="result-section">
            <h3>差异操作</h3>
            <pre class="result-json">{{ diffResult }}</pre>
          </div>
          <div v-if="appliedResult" class="result-section">
            <h3>应用结果</h3>
            <pre class="result-json">{{ appliedResult }}</pre>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

header {
  text-align: center;
  margin-bottom: 40px;
}

header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

header p {
  color: #7f8c8d;
  font-size: 16px;
}

.test-section {
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  background: #fafbfc;
}

.test-section h2 {
  margin-top: 0;
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 8px;
}

.test-content {
  margin-top: 15px;
}

.test-button {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.test-button:hover {
  background: #2980b9;
}

.test-button.primary {
  background: #27ae60;
}

.test-button.primary:hover {
  background: #229954;
}

.test-button.secondary {
  background: #e74c3c;
  margin-left: 10px;
}

.test-button.secondary:hover {
  background: #c0392b;
}

.result {
  margin-top: 10px;
  padding: 10px;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 4px;
  color: #155724;
}

.test-cases {
  margin-bottom: 20px;
}

.test-cases h3 {
  margin-bottom: 10px;
  color: #2c3e50;
}

.test-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.test-case-button {
  background: #95a5a6;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.test-case-button:hover {
  background: #7f8c8d;
}

.json-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.json-input h3 {
  margin-bottom: 8px;
  color: #2c3e50;
}

.json-textarea {
  width: 100%;
  height: 200px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  resize: vertical;
}

.actions {
  margin-bottom: 20px;
}

.error {
  padding: 10px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
  margin-bottom: 20px;
}

.results {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.result-section h3 {
  margin-bottom: 8px;
  color: #2c3e50;
}

.result-json {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 15px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .json-inputs,
  .results {
    grid-template-columns: 1fr;
  }

  .app {
    padding: 10px;
  }
}
</style>
