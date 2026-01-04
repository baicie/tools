<script setup lang="ts">
import { plus100 } from '@baicie/napi-browser'
import { ref } from 'vue'

const result = ref(0)

const handleClick = () => {
  result.value = plus100(100)
  console.log(result.value)
}

</script>

<template>
  <button @click="handleClick">click</button>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
