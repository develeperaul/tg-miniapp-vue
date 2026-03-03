<template>
<div class="bg-white py-[35px] rounded-[30px] h-full grid content-start grid-rows-[auto_1f]"> 
  <div class=" flex   justify-between items-center mb-11">
    <div class=" h1 ">
      {{ title }}
    </div>
    <div @click="router.go(-1)"  class="text-gray flex items-center gap-1.5">
      Назад
      <div class=" grid place-content-center bg-[#242F9B33] w-[26px] h-[26px] rounded-full  ">
        <svg width="17" height="8" viewBox="0 0 17 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0.146446 3.32845C-0.0488148 3.52372 -0.0488148 3.8403 0.146446 4.03556L3.32843 7.21754C3.52369 7.4128 3.84027 7.4128 4.03553 7.21754C4.2308 7.02228 4.2308 6.7057 4.03553 6.51044L1.20711 3.68201L4.03553 0.853581C4.2308 0.658319 4.2308 0.341736 4.03553 0.146474C3.84027 -0.0487882 3.52369 -0.0487881 3.32843 0.146474L0.146446 3.32845ZM16.5 3.68201L16.5 3.18201L0.5 3.18201L0.5 3.68201L0.5 4.18201L16.5 4.18201L16.5 3.68201Z" fill="#B6B6B6"/>
        </svg>

      </div>
    </div>
  </div>
  <div>
    <slot/>
  </div>
</div>
</template>
<script setup lang='ts'>
import { useRouter } from 'vue-router';

const props = defineProps<{
  title: string
}>()
const router = useRouter()
</script>
<style lang='scss' scoped> 
</style>