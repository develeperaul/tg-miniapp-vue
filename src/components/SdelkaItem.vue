<template>
<div @click="goMes" class=" sdelkaitem " :class="`sdelkaitem_${theme}`" >
  <div class=" h2"> Чат с {{ chat.name }}
  </div>
  <div v-if="chat.message">
   Дата создания {{ formatDate(chat.message.created_at) }}
    <!-- {{chat.message.sender.type}} -->
  </div>
  <div v-if="chat.unread_messages_count" class="sdelkaitem__count">
    {{ chat.unread_messages_count }}
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
  position: relative;
  &_white {
    @apply bg-white;
  }
  &_blue {
    @apply bg-primary text-white;
  }
  &__count {
    position: absolute;

    @apply bg-primary rounded-full text-white right-2 top-6 w-6 h-6 grid place-content-center font-inter font-semibold;
  }
}
</style>