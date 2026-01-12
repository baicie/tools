<template>
  <div class="json-node" :style="{ marginLeft: level * 20 + 'px' }">
    <!-- 展开/折叠按钮 -->
    <button
      v-if="isExpandable"
      @click="toggleExpanded"
      class="expand-btn"
      :class="{ expanded }"
    >
      {{ expanded ? '▼' : '▶' }}
    </button>

    <!-- 键名 -->
    <span v-if="key !== null" class="key">
      "{{ key }}":
    </span>

    <!-- 值 -->
    <span v-if="!isExpandable" :class="['value', valueClass]">
      {{ formatValue(data) }}
    </span>

    <!-- 对象/数组开始 -->
    <span v-else-if="isExpandable" class="bracket">
      {{ isArray ? '[' : '{' }}
      <span v-if="!expanded" class="collapsed">
        {{ isArray ? `... ${data.length} items` : `... ${Object.keys(data).length} items` }}
      </span>
    </span>

    <!-- 对象/数组内容 -->
    <div v-if="isExpandable && expanded" class="children">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="child-item"
      >
        <JsonNode
          :data="item.value"
          :key="item.key"
          :path="item.fullPath"
          :diff-items="diffItems"
          :is-original="isOriginal"
          :level="(level as number) + 1"
        />
        <span v-if="(index as number) < items.length - 1" class="comma">,</span>
      </div>
    </div>

    <!-- 对象/数组结束 -->
    <span v-if="isExpandable && expanded" class="bracket">
      {{ isArray ? ']' : '}' }}
    </span>

    <!-- 逗号（除了最后一项）-->
    <span v-if="showComma" class="comma">,</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface DiffItem {
  operation: string
  path: string
  oldValue?: any
  newValue?: any
}

interface Props {
  data: any
  key?: string | null
  path: string
  diffItems: DiffItem[]
  isOriginal: boolean
  level: number
}

const props = withDefaults(defineProps<Props>(), {
  key: null
})

const expanded = ref((props.level as number) < 2) // 默认展开前两级

const isArray = computed(() => Array.isArray(props.data))
const isObject = computed(() => typeof props.data === 'object' && props.data !== null && !isArray.value)
const isExpandable = computed(() => isArray.value || isObject.value)

const items = computed(() => {
  if (isArray.value) {
    return props.data.map((item: any, index: number) => ({
      key: null,
      value: item,
      fullPath: props.path ? `${props.path}.${index}` : `${index}`
    }))
  } else if (isObject.value) {
    return Object.entries(props.data).map(([key, value]) => ({
      key,
      value,
      fullPath: props.path ? `${props.path}.${key}` : key
    }))
  }
  return []
})

// 检查当前路径是否有差异
const pathDiff = computed(() => {
  return props.diffItems.find(item => item.path === props.path)
})

// 根据差异确定样式类
const valueClass = computed(() => {
  if (!pathDiff.value) return ''

  const diff = pathDiff.value
  if (props.isOriginal) {
    // 原始JSON中：删除的标红，修改的标橙
    if (diff.operation === 'remove') return 'diff-removed'
    if (diff.operation === 'replace') return 'diff-modified'
  } else {
    // 新JSON中：新增的标绿，修改的标橙
    if (diff.operation === 'add') return 'diff-added'
    if (diff.operation === 'replace') return 'diff-modified'
  }
  return ''
})

// 格式化值显示
const formatValue = (value: any) => {
  if (typeof value === 'string') {
    return `"${value}"`
  }
  if (typeof value === 'boolean' || typeof value === 'number' || value === null) {
    return String(value)
  }
  return ''
}

const toggleExpanded = () => {
  expanded.value = !expanded.value
}

// 不在最后一项时显示逗号
const showComma = computed(() => {
  // 简化逻辑，实际应该由父组件传递
  return false
})
</script>

<style scoped>
.json-node {
  position: relative;
  white-space: nowrap;
}

.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  font-size: 11px;
  padding: 0;
  margin-right: 4px;
  width: 16px;
  text-align: center;
  line-height: 1;
  transition: transform 0.2s ease, color 0.2s ease;
}

.expand-btn:hover {
  color: #333;
}

.expand-btn.expanded {
  transform: rotate(0deg);
}

.expand-btn:not(.expanded) {
  transform: rotate(0deg);
}

.key {
  color: #2c3e50;
  font-weight: 500;
  margin-right: 4px;
}

.value {
  color: #27ae60;
}

.value.diff-added {
  background-color: rgba(39, 174, 96, 0.1);
  border-radius: 2px;
  padding: 1px 2px;
}

.value.diff-removed {
  background-color: rgba(231, 76, 60, 0.1);
  border-radius: 2px;
  padding: 1px 2px;
  text-decoration: line-through;
}

.value.diff-modified {
  background-color: rgba(255, 193, 7, 0.1);
  border-radius: 2px;
  padding: 1px 2px;
}

.bracket {
  color: #666;
}

.collapsed {
  color: #999;
  font-style: italic;
}

.children {
  border-left: 1px solid #e1e8ed;
  margin-left: 12px;
  padding-left: 8px;
  transition: all 0.3s ease;
}

.child-item {
  position: relative;
}

.comma {
  color: #666;
}

/* 高亮差异的背景色 */
.json-node:has(.diff-added),
.json-node:has(.diff-removed),
.json-node:has(.diff-modified) {
  background-color: rgba(255, 255, 255, 0.8);
}
</style>