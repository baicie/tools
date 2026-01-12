<template>
  <div class="json-editor-container">
    <!-- 隐藏的textarea用于实际编辑 -->
    <textarea
      ref="textareaRef"
      v-model="internalValue"
      :placeholder="placeholder"
      class="json-editor-textarea"
      @input="handleInput"
      @scroll="handleScroll"
      spellcheck="false"
    ></textarea>

    <!-- 高亮的预览层 -->
    <pre
      ref="highlightRef"
      class="json-editor-highlight"
      @scroll="handleScroll"
      v-html="highlightedContent"
    ></pre>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'

interface DiffItem {
  operation: string
  path: string
  oldValue?: any
  newValue?: any
}

interface Props {
  modelValue: string
  placeholder?: string
  diffItems: DiffItem[]
  isOriginal: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
})

const emit = defineEmits<Emits>()

const internalValue = ref(props.modelValue)
const textareaRef = ref<HTMLTextAreaElement>()
const highlightRef = ref<HTMLPreElement>()

// 同步外部值到内部
watch(() => props.modelValue, (newVal) => {
  internalValue.value = newVal
})

// 获取路径对应的差异类型
const getPathDiffType = (path: string): string => {
  const diff = props.diffItems.find(item => item.path === path)
  if (!diff) return ''

  if (props.isOriginal) {
    // 原始JSON中：删除标红，修改标橙
    if (diff.operation === 'remove') return 'diff-removed'
    if (diff.operation === 'replace') return 'diff-modified'
  } else {
    // 新JSON中：新增标绿，修改标橙
    if (diff.operation === 'add') return 'diff-added'
    if (diff.operation === 'replace') return 'diff-modified'
  }
  return ''
}

// 高亮JSON内容
const highlightedContent = computed(() => {
  if (!internalValue.value.trim()) return ''

  try {
    const parsed = JSON.parse(internalValue.value)
    return highlightJson(parsed)
  } catch {
    // JSON无效时显示普通文本
    return escapeHtml(internalValue.value)
  }
})

// 递归高亮JSON
const highlightJson = (value: any, path: string = '', indent: number = 0): string => {
  const indentStr = '  '.repeat(indent)

  if (value === null) {
    const className = getPathDiffType(path)
    return `<span class="json-null ${className}">null</span>`
  }

  if (typeof value === 'boolean') {
    const className = getPathDiffType(path)
    return `<span class="json-boolean ${className}">${value}</span>`
  }

  if (typeof value === 'number') {
    const className = getPathDiffType(path)
    return `<span class="json-number ${className}">${value}</span>`
  }

  if (typeof value === 'string') {
    const className = getPathDiffType(path)
    return `<span class="json-string ${className}">"${escapeHtml(value)}"</span>`
  }

  if (Array.isArray(value)) {
    const className = getPathDiffType(path)
    let result = `<span class="json-bracket ${className}">[</span>`

    if (value.length > 0) {
      result += '\n'
      value.forEach((item, index) => {
        const itemPath = path ? `${path}.${index}` : `${index}`
        result += `${indentStr}  ${highlightJson(item, itemPath, indent + 1)}`
        if (index < value.length - 1) result += ','
        result += '\n'
      })
      result += indentStr
    }

    result += `<span class="json-bracket ${className}">]</span>`
    return result
  }

  if (typeof value === 'object') {
    const className = getPathDiffType(path)
    let result = `<span class="json-bracket ${className}">{</span>`

    const entries = Object.entries(value)
    if (entries.length > 0) {
      result += '\n'
      entries.forEach(([key, val], index) => {
        const keyPath = path ? `${path}.${key}` : key
        const keyClass = getPathDiffType(keyPath)
        result += `${indentStr}  <span class="json-key ${keyClass}">"${escapeHtml(key)}"</span>: ${highlightJson(val, keyPath, indent + 1)}`
        if (index < entries.length - 1) result += ','
        result += '\n'
      })
      result += indentStr
    }

    result += `<span class="json-bracket ${className}">}</span>`
    return result
  }

  return ''
}

// HTML转义
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m] || m)
}

// 处理输入
const handleInput = () => {
  emit('update:modelValue', internalValue.value)
}

// 同步滚动
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  const isTextarea = target.tagName === 'TEXTAREA'

  if (isTextarea && highlightRef.value) {
    highlightRef.value.scrollTop = target.scrollTop
    highlightRef.value.scrollLeft = target.scrollLeft
  } else if (textareaRef.value) {
    textareaRef.value.scrollTop = target.scrollTop
    textareaRef.value.scrollLeft = target.scrollLeft
  }
}

// 当内容变化时，更新高亮
watch(highlightedContent, () => {
  nextTick(() => {
    syncScroll()
  })
})

// 同步滚动位置
const syncScroll = () => {
  if (textareaRef.value && highlightRef.value) {
    highlightRef.value.scrollTop = textareaRef.value.scrollTop
    highlightRef.value.scrollLeft = textareaRef.value.scrollLeft
  }
}
</script>

<style scoped>
.json-editor-container {
  position: relative;
  width: 100%;
  height: 200px;
}

.json-editor-textarea,
.json-editor-highlight {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 10px;
  margin: 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
  resize: vertical;
  overflow: auto;
  white-space: pre;
  word-wrap: normal;
  tab-size: 2;
}

.json-editor-textarea {
  background: transparent;
  color: transparent;
  caret-color: #333;
  z-index: 2;
  outline: none;
}

.json-editor-textarea:focus {
  border-color: #007bff;
}

.json-editor-highlight {
  background: #f8f9fa;
  color: #333;
  z-index: 1;
  pointer-events: none;
  user-select: none;
}

/* JSON语法高亮样式 */
.json-string {
  color: #27ae60;
}

.json-number {
  color: #e74c3c;
}

.json-boolean {
  color: #9b59b6;
}

.json-null {
  color: #95a5a6;
}

.json-key {
  color: #2c3e50;
  font-weight: 500;
}

.json-bracket {
  color: #666;
}

/* 差异标记样式 */
.diff-added {
  background-color: rgba(39, 174, 96, 0.2);
  border-radius: 2px;
  padding: 1px 2px;
  margin: 0 -2px;
}

.diff-removed {
  background-color: rgba(231, 76, 60, 0.2);
  border-radius: 2px;
  padding: 1px 2px;
  margin: 0 -2px;
  text-decoration: line-through;
}

.diff-modified {
  background-color: rgba(255, 193, 7, 0.2);
  border-radius: 2px;
  padding: 1px 2px;
  margin: 0 -2px;
}

/* 滚动条样式 */
.json-editor-textarea::-webkit-scrollbar,
.json-editor-highlight::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.json-editor-textarea::-webkit-scrollbar-track,
.json-editor-highlight::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.json-editor-textarea::-webkit-scrollbar-thumb,
.json-editor-highlight::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.json-editor-textarea::-webkit-scrollbar-thumb:hover,
.json-editor-highlight::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>