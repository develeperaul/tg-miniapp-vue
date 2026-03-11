<template>

  <form
    class=" space-y-5"
    @submit.prevent="onSubmit"
  >



    <!-- ДОКУМЕНТЫ -->
    <div class="flex gap-3 flex-wrap">
      <!-- уже добавленные -->
      <FileTile
        v-for="f in files"
        :key="f.id"
        :id="f.id"
        :url="f.preview"
        :noimg="f.noimg"
        :loading="f.loading"
        @deleteFile="handleDeleteFile"
      />
      <!-- кнопка добавить -->
      <FileTile @fileLoad="handleFileLoad" />
    </div>
    <ErrorMessage
      name="files"
      class="text-[11px] text-red-500"
    />
    
    <!-- КНОПКА ОТПРАВИТЬ -->
    <button
      type="submit"
      class="w-full h-12 rounded-[999px] bg-[#242F9B] text-white font-bold text-sm  mt-4"
      :disabled="submitting"
    >
      {{ btntitle }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Field, ErrorMessage, useForm } from 'vee-validate'
import * as yup from 'yup'
import FileTile from './FileTile.vue' // проверь, что именно ТАК называется файл
import { uploadFile } from '../api/main'

type UiFile = {
  id: string
  preview: string
  noimg: boolean
  loading: boolean
  serverId?: string
}
const props = withDefaults(defineProps<
  { btntitle?: string }
> (), {
  btntitle: 'Перейти к диалогу'
})
const emit = defineEmits<{
  (e: 'send', vals: any): void
}>()

const files = ref<UiFile[]>([])
const submitting = ref(false)

// ───── схема валидации (файлы НЕ обязательны) ─────
const schema = yup.object({
  
  files: yup
    .array()
    .of(yup.string())
    .nullable()
})

// один-единственный контекст формы
const { handleSubmit, setFieldValue, setFieldError } = useForm<{
  files: string[] | null
}>({
  validationSchema: schema,
  initialValues: {
    files: null
  }
})

// ───── ограничения по файлам ─────
const MAX_SIZE =  20 * 1024 * 1024 // 20 МБ

function isTooLarge(file: File) {
  return file.size > MAX_SIZE
}

const allowedExt = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx']

function isAllowedFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return allowedExt.includes(ext)
}


async function uploadFileToServer(file: File): Promise<{ id: string; url?: string }> {
  
  const res = (await uploadFile(file)).data
  
  return {
    id: res.uuid,
    url: res.url
  }
}

// обработка выбора файла
async function handleFileLoad(file: File) {
  // 1) формат
  if (!isAllowedFile(file)) {
    setFieldError(
      'files',
      'Допустимые форматы: pdf, jpg, jpeg, png, doc, docx, xls, xlsx'
    )
    return
  }

  // 2) размер
  if (isTooLarge(file)) {
    setFieldError('files', 'Файл слишком большой. Максимум 20 МБ')
    return
  }

  // всё ок — очищаем прошлую ошибку
  setFieldError('files', '')

  const id = crypto.randomUUID()
  const isImage = file.type.startsWith('image/')
  const preview = isImage ? URL.createObjectURL(file) : file.name

  const item: UiFile = {
    id,
    preview,
    noimg: !isImage,
    loading: true
  }
  files.value.push(item)

  try {
    const res = await uploadFileToServer(file)

    const target = files.value.find(f => f.id === id)
    if (target) {
      target.loading = false
      target.serverId = res.id
      if (res.url && isImage) {
        target.preview = res.url
      }
    }

    const serverIds = files.value
      .filter(f => f.serverId)
      .map(f => f.serverId as string)

    setFieldValue('files', serverIds.length ? serverIds : null)
  } catch (e) {
    files.value = files.value.filter(f => f.id === id)
  }
}

function handleDeleteFile(id: string) {
  files.value = files.value.filter(f => f.id !== id)

  const serverIds = files.value
    .filter(f => f.serverId)
    .map(f => f.serverId as string)

  setFieldValue('files', serverIds.length ? serverIds : null)
}

// сабмит
const onSubmit = handleSubmit(values => {
  submitting.value = true
  const text = 'Подписать документы'
  console.log(values);
  const images = files.value.map(f => { return { uuid: f.serverId } })
  try {
    // emit('send', { images: values.files, text })
    emit('send', { images, text })
    // console.log('submit', values)
    // values.amount
    // values.description
    // values.files (массив serverId или null)
  } finally {
    submitting.value = false
  }
})
</script>
