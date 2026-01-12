<template>
  <div class="json-diff-visualizer">
  <div class="diff-header">
    <h3>JSON 差异可视化</h3>
    <div class="header-actions">
      <div class="legend">
        <div class="legend-item">
          <span class="color-box added"></span>
          新增
        </div>
        <div class="legend-item">
          <span class="color-box removed"></span>
          删除
        </div>
        <div class="legend-item">
          <span class="color-box modified"></span>
          修改
        </div>
      </div>
      <button @click="copyDiffResult" class="copy-btn" :disabled="diffItems.length === 0">
        📋 复制差异
      </button>
    </div>
  </div>

    <div class="json-container">
      <div class="json-panel">
        <h4>原始 JSON</h4>
        <JsonEditor
          v-model="oldJson"
          placeholder="输入原始 JSON"
          :diff-items="diffItems"
          :is-original="true"
        />
      </div>

      <div class="json-panel">
        <h4>新 JSON</h4>
        <JsonEditor
          v-model="newJson"
          placeholder="输入新 JSON"
          :diff-items="diffItems"
          :is-original="false"
        />
      </div>

      <div class="json-panel">
        <h4>差异操作</h4>
        <div class="diff-content">
          <div v-if="isLoading" class="loading">
            🔄 正在计算差异...
          </div>
          <div v-else-if="diffItems.length > 0">
            <div
              v-for="(item, index) in diffItems"
              :key="index"
              :class="['diff-item', item.operation]"
            >
              <div class="diff-header">
                <span class="operation-icon">{{ getOperationIcon(item.operation) }}</span>
                <span class="path">{{ item.path }}</span>
                <span class="operation-label">{{ getOperationLabel(item.operation) }}</span>
              </div>

              <div class="diff-values">
                <div v-if="item.oldValue !== undefined" class="old-value">
                  <span class="label">旧值:</span>
                  <span class="value">{{ formatValue(item.oldValue) }}</span>
                </div>
                <div v-if="item.newValue !== undefined" class="new-value">
                  <span class="label">新值:</span>
                  <span class="value">{{ formatValue(item.newValue) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-differences">
            两个JSON完全相同，没有差异
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getJsonDiffDetails } from '@baicie/napi-browser'
import JsonEditor from './JsonEditor.vue'

interface DiffItem {
  operation: string
  path: string
  oldValue?: any
  newValue?: any
}

interface Props {
  originalJson: string
  newJson: string
}

const props = defineProps<Props>()

const diffItems = ref<DiffItem[]>([])
const error = ref<string>('')
const isLoading = ref(false)
const oldJson = ref(props.originalJson)
const newJson = ref(props.newJson)

const loadDiffDetails = async () => {
  try {
    isLoading.value = true
    error.value = ''
    const result = await getJsonDiffDetails(props.originalJson, props.newJson)
    diffItems.value = JSON.parse(result)
  } catch (err) {
    error.value = `加载差异详情失败: ${err}`
    diffItems.value = []
  } finally {
    isLoading.value = false
  }
}

const copyDiffResult = async () => {
  try {
    const diffText = JSON.stringify(diffItems.value, null, 2)
    await navigator.clipboard.writeText(diffText)
    // 可以添加一个临时的成功提示
    console.log('差异已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
  }
}

const getOperationIcon = (operation: string) => {
  switch (operation) {
    case 'add': return '+'
    case 'remove': return '-'
    case 'replace': return '~'
    default: return '?'
  }
}

const getOperationLabel = (operation: string) => {
  switch (operation) {
    case 'add': return '新增'
    case 'remove': return '删除'
    case 'replace': return '修改'
    default: return operation
  }
}

const formatValue = (value: any) => {
  if (typeof value === 'string') {
    return `"${value}"`
  }
  return JSON.stringify(value)
}

// 监听输入变化，自动重新计算差异
watch([oldJson, newJson], loadDiffDetails)

// 初始化时加载差异
loadDiffDetails()
</script>

<style scoped>
.json-diff-visualizer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.diff-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #3498db;
  flex-wrap: wrap;
  gap: 15px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.diff-header h3 {
  margin: 0;
  color: #2c3e50;
}

.legend {
  display: flex;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
}

.color-box {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.color-box.added {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

.color-box.removed {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

.color-box.modified {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
}

.copy-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s ease;
}

.copy-btn:hover:not(:disabled) {
  background: #5a6268;
}

.copy-btn:disabled {
  background: #adb5bd;
  cursor: not-allowed;
  opacity: 0.6;
}

.json-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
}

@media (max-width: 1200px) {
  .json-container {
    grid-template-columns: 1fr 1fr;
  }

  .json-container .json-panel:nth-child(3) {
    grid-column: 1 / -1;
  }
}

.json-panel {
  background: #fafbfc;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 15px;
}

.json-panel h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
}

.json-viewer {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
}

.diff-content {
  max-height: 400px;
  overflow-y: auto;
}

.diff-item {
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  margin-bottom: 10px;
  padding: 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.diff-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background-color: transparent;
  transition: background-color 0.3s ease;
}

.diff-item.add::before {
  background-color: #28a745;
}

.diff-item.remove::before {
  background-color: #dc3545;
}

.diff-item.replace::before {
  background-color: #ffc107;
}

.diff-item.add {
  background-color: #d4edda;
  border-color: #c3e6cb;
}

.diff-item.remove {
  background-color: #f8d7da;
  border-color: #f5c6cb;
}

.diff-item.replace {
  background-color: #fff3cd;
  border-color: #ffeaa7;
}

.diff-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.diff-item .diff-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  border: none;
  padding: 0;
}

.operation-icon {
  font-weight: bold;
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.operation-icon.add {
  color: #28a745;
}

.operation-icon.remove {
  color: #dc3545;
}

.operation-icon.replace {
  color: #ffc107;
}

.path {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
  flex: 1;
}

.operation-label {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.add .operation-label {
  background-color: #d4edda;
  color: #155724;
}

.remove .operation-label {
  background-color: #f8d7da;
  color: #721c24;
}

.replace .operation-label {
  background-color: #fff3cd;
  color: #856404;
}

.diff-values {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.old-value,
.new-value {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.label {
  font-weight: 500;
  color: #495057;
  min-width: 40px;
  flex-shrink: 0;
}

.value {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #2c3e50;
  background: rgba(255,255,255,0.7);
  padding: 4px 8px;
  border-radius: 3px;
  word-break: break-all;
}

.old-value .value {
  background: rgba(248, 215, 218, 0.3);
}

.new-value .value {
  background: rgba(212, 237, 218, 0.3);
}

.loading {
  text-align: center;
  color: #6c757d;
  padding: 40px 20px;
  font-style: italic;
}

.no-differences {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 40px 20px;
}

.error-message {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
  padding: 15px;
  margin-top: 20px;
  text-align: center;
}

@media (max-width: 768px) {
  .json-container {
    grid-template-columns: 1fr;
  }

  .diff-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }

  .legend {
    flex-wrap: wrap;
  }
}
</style>