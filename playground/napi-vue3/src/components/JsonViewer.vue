<template>
  <div class="json-viewer">
    <div v-if="data === null" class="error">
      无效的JSON格式
    </div>
    <div v-else>
      <JsonNode
        :data="data"
        :path="''"
        :diff-items="diffItems"
        :is-original="isOriginal"
        :expanded="true"
        :level="0"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import JsonNode from './JsonNode.vue'

interface DiffItem {
  operation: string
  path: string
  oldValue?: any
  newValue?: any
}

interface Props {
  data: any
  diffItems: DiffItem[]
  isOriginal: boolean
}

defineProps<Props>()
</script>

<style scoped>
.json-viewer {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.error {
  color: #dc3545;
  padding: 10px;
  background: #f8d7da;
  border-radius: 4px;
}
</style>