<template>
  <div class=" pt grid  min-h-screen" >

    <Card class="container  mt-3" title="Подписать документы">
      <div class=" grid   gap-5">
        <!-- для Бухгалтерия -->
        <!-- <a href="/" class=" text-blue-500 underline text-center text-lg  ">
            Скачать образец реестра
          </a> -->
        <!-- <PaymentForm @send="send"/> -->
        <a v-if="linkFNS" :href=" linkFNS" class=" text-blue-500 underline text-center text-lg  " target="_blank">
           Ссылка для скачивания
         </a>
         <FileTile v-else @fileLoad="handleFileLoad" />
        <div>
          <div class=" h2 mb-15">
            Активные чаты
          </div>
          <div class=" grid gap-15">
            
            <SdelkaItem theme="blue" :chat="value" v-for="value in chats.data"/>
          </div>
        </div>
      </div>
      </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { chat, sendFNS, sendMess } from '../api/chats';
import Card from '../components/Card.vue';
import PaymentForm from '../components/PaymentForm.vue';
import SdelkaItem from '../components/SdelkaItem.vue';
import { storeToRefs } from 'pinia';
import { useChatsStore } from '../stores/chats';
import { Field, ErrorMessage, useForm } from 'vee-validate'
import FileTile from '../components/FileTile.vue' 
import * as yup from 'yup'
import { useMainStore } from '../stores/main';
import { useNotifyStore } from '../stores/notifications';
import { useRouter } from 'vue-router';
const { chats } = storeToRefs(useChatsStore())

type UiFile = {
  id: string
  preview: string
  noimg: boolean
  loading: boolean
  serverId?: string
}

const { profile, load } = storeToRefs(useMainStore())
const router = useRouter()
const linkFNS = ref('')
const file = ref<UiFile | null>(null)
const submitting = ref(false)

// ───── схема валидации (файлы НЕ обязательны) ─────
const schema = yup.object({
  amount: yup
    .number()
    .typeError('Введите сумму')
    .positive('Сумма должна быть больше нуля')
    .required('Обязательное поле'),
  description: yup.string().required('Обязательное поле'),
  file: yup
    .string()
    .nullable()
})


const { handleSubmit, setFieldValue, setFieldError } = useForm<{
  file: string | null
}>({
  validationSchema: schema,
  initialValues: {
    file: null
  }
})
// ───── ограничения по файлам ─────
const MAX_SIZE =  20 * 1024 * 1024 // 20 МБ

function isTooLarge(file: File) {
  return file.size > MAX_SIZE
}

const allowedExt = ['pdf']

function isAllowedFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return allowedExt.includes(ext)
}



// обработка выбора файла
async function handleFileLoad(f: File) {
  
  // 1) формат
  if (!isAllowedFile(f)) {
    useNotifyStore().add('Допустимые форматы: pdf', 'warning')
    
    
    return
  }

  // 2) размер
  if (isTooLarge(f)) {
    useNotifyStore().add('Файл слишком большой. Максимум 20 МБ');
    return
  }

  
  load.value = true
  if (profile.value) 
    try {
      const res = await sendFNS(profile.value?.telegram_chat_id, f);
      
      
      if (res.data.message.hasOwnProperty('media') && res.data.message.media) {
        linkFNS.value= res.data.message.media[0]?.url
      } else {
        router.push({ name: 'Dialog', params: {uuid: res.data.uuid}})
      }
    } catch (e) {
      throw evue
    } finally {
      load.value = false
    }
  // const id = crypto.randomUUID()
  // const isImage = f.type.startsWith('image/')
  // const preview = isImage ? URL.createObjectURL(f) : f.name

  // const item: UiFile = {
  //   id,
  //   preview,
  //   noimg: !isImage,
  //   loading: true
  // }
  // file.value =item
}

function handleDeleteFile(id: string) {
  files.value = files.value.filter(f => f.id !== id)

  const serverIds = files.value
    .filter(f => f.serverId)
    .map(f => f.serverId as string)

  setFieldValue('files', serverIds.length ? serverIds : null)
}

const send = async (vals: { text: string, images: { uuid: string }[]}) => {
  const chatsRes = (await chat("accountant")).data;
  if (chatsRes.uuid) {
    sendMess(chatsRes.uuid, vals)
  }
  }
</script>
