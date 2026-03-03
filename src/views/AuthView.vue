<template>
  <div class=" pt grid  min-h-screen bg-white" >
    <div class="container grid content-center ">

      <form
        class=" space-y-5"
        @submit.prevent="onSubmit"
      >
        <h1 class=" text-xl text-center font-semibold">Авторизация</h1>
    
        <!-- СУММА -->
        <div class="space-y-1">
          <Field name="token" v-slot="{ field, meta }">
            <input
              v-bind="field"
              placeholder="Токен"
              class="w-full h-12 rounded-[18px] border px-4 text-sm outline-none"
              :class="meta.touched && meta.invalid ? 'border-red-500' : 'border-[#28348A]'"
            />
          </Field>
          <ErrorMessage
            name="amount"
            class="text-[11px] text-red-500"
          />
        </div>
    
        <!-- КНОПКА ОТПРАВИТЬ -->
        <button
          type="submit"
          class="w-full h-12 rounded-[999px] bg-[#242F9B] text-white font-bold text-sm  mt-4"
          :disabled="submitting"
        >
          {{ submitting ? 'Отправка…' : 'Отправить' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Field, ErrorMessage, useForm } from 'vee-validate'
import * as yup from 'yup'
import { useMainStore } from '../stores/main';
import { cleanTokensData, setTokensData } from '../api/tokens';
import { useRouter } from 'vue-router';

const emit = defineEmits<{
  (e: 'send', vals: any): void
}>()

const router = useRouter()
const submitting = ref(false)

// ───── схема валидации (файлы НЕ обязательны) ─────
const schema = yup.object({
  token: yup.string().required('Обязательное поле'),
  
})

// один-единственный контекст формы
const { handleSubmit, resetForm} = useForm<{
  token: string
}>({
  validationSchema: schema,
  initialValues: {
    amount: null,
    description: '',
    files: null
  }
})


// сабмит

const onSubmit =  handleSubmit(async values => {
  submitting.value = true
  setTokensData(values.token.trim(), 30)
  try {
    await useMainStore().setProfile()
    router.push({ name: 'Home' });
  }
  catch (e) {
    if (e?.response?.status === 401) { 
      cleanTokensData()
      resetForm()
    }
    throw e
  }
  finally {
    submitting.value = false
  }
})
</script>
