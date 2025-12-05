<script setup lang="ts">
import { subscribeStorageChanges } from '@baicie/storage'
subscribeStorageChanges((change) => {
  console.log(change)
}, {
  exclude: [
    {
      key: 'test',
    }
  ]
})
localStorage.setItem('test', 'test')
localStorage.setItem('test2', 'test')

</script>

<template>
  <div>
    storage
  </div>
</template>