<template>
  <router-view class="env-t env-b" :class="{ 'footer-clearance': route.name === 'Operator' || route.name === 'Buhg' }" />
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<style scoped>
.footer-clearance {
  padding-bottom: calc(var(--footer-nav-height, 120px) + 10px);
}
</style>
