<template>
<div @click="goMes" class=" sdelkaitem " :class="`sdelkaitem_${theme}`" >
  <div class=" h2"> Чат №{{ chat.id }}
  </div>
  <div v-if="chat.message">
   Дата создания {{ formatDate(chat.message.created_at) }}
    <!-- {{chat.message.sender.type}} -->
  </div>
</div>
</template>
<script setup lang='ts'>
import { useRouter } from 'vue-router';
import type { ChatT } from '../models/api';
import { formatDate } from '../utils/date';

const props = withDefaults(defineProps<{
  chat: ChatT
  // title: string,
  // subtitle: string,
  theme?: 'white' | 'blue'
}>(), {
  theme: 'white'
})

const router = useRouter()
const goMes = () => {
  router.push({ name: 'Dialog', params: {uuid: props.chat.uuid}})
}
</script>
<style lang='scss' scoped> 
.sdelkaitem {
  @apply rounded-base  px-[22px] py-[30px] grid gap-[5px];
  &_white {
    @apply bg-white;
  }
  &_blue {
    @apply bg-primary text-white;
  }
}
</style>