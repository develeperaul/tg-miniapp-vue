<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${size} ${size}`"
    class="circular-progress"
  >
    <circle
      :cx="center"
      :cy="center"
      :r="radius"
      :stroke-width="strokeWidth"
      stroke="#e5e7eb"
      fill="none"
    />
    <circle
      :cx="center"
      :cy="center"
      :r="radius"
      :stroke-width="strokeWidth"
      :stroke="color"
      fill="none"
      stroke-linecap="round"
      :stroke-dasharray="circumference"
      :stroke-dashoffset="dashOffset"
      class="progress-arc"
    />
    <text
      :x="center"
      :y="center"
      text-anchor="middle"
      dominant-baseline="central"
      :font-size="fontSize"
      font-weight="700"
      :fill="color"
    >
      {{ displayPercent }}%
    </text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
}>(), {
  size: 60,
  strokeWidth: 5,
  color: '#242F9B',
})

const center = computed(() => props.size / 2)
const radius = computed(() => center.value - props.strokeWidth / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() =>
  circumference.value * (1 - Math.min(Math.max(props.progress, 0), 100) / 100)
)
const displayPercent = computed(() => Math.min(Math.max(Math.round(props.progress), 0), 100))
const fontSize = computed(() => Math.round(props.size * 0.3))
</script>

<style scoped>
.circular-progress {
  transform: rotate(-90deg);
}
.circular-progress text {
  transform: rotate(90deg);
}
.progress-arc {
  transition: stroke-dashoffset 0.3s ease;
}
</style>
