<template>
  <!-- ячейка с уже добавленным файлом -->
  <div v-if="id" class="file-img">
    <div v-if="!loading" class="file-img__btn" @click="emit('deleteFile', id)">
      <!-- крестик -->
      <svg
        width="23"
        height="23"
        viewBox="0 0 33 33"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M29.4519 16.0645C29.4519 23.458 23.4583 29.4516 16.0648 29.4516C8.67134 29.4516 2.67773 23.458 2.67773 16.0645C2.67773 8.67104 8.67134 2.67743 16.0648 2.67743C23.4583 2.67743 29.4519 8.67104 29.4519 16.0645Z"
          fill="#FF3B30"
        />
        <path
          d="M7.9668 16H23.1126"
          stroke="white"
          stroke-width="2.00806"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>

    <!-- контент -->
    <div v-if="noimg" class="file-img__url">
      <svg style="width: 100%; height: 100%;" viewBox="0 0 400 460" fill="none" xmlns="http://www.w3.org">
        
        <path d="M60 20C37.9086 20 20 37.9086 20 60V400C20 422.091 37.9086 440 60 440H340C362.091 440 380 422.091 380 400V133.137C380 122.528 375.786 112.354 368.284 104.853L295.147 31.7157C287.646 24.2143 277.472 20 266.863 20H60Z" stroke="#231531" stroke-width="40" stroke-linejoin="round"/>
        
        
        <path d="M260 20V100C260 122.091 277.909 140 300 140H380" stroke="#231531" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
        
        
        <text x="50%" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="110" fill="#231531">DOC</text>
      </svg>

      <!-- {{ url }} -->
    </div>
    <template v-else>
      <img v-if="url" :src="url" alt="" />
    </template>

    <!-- спинер поверх, пока грузим -->
    <div v-if="loading" class="file-img__spinner">
      <svg class="file-img__spinner-icon" viewBox="0 0 24 24">
        <circle
          class="track"
          cx="12"
          cy="12"
          r="10"
          stroke-width="3"
          fill="none"
        />
        <circle
          class="head"
          cx="12"
          cy="12"
          r="10"
          stroke-width="3"
          fill="none"
          stroke-linecap="round"
        />
      </svg>
    </div>
  </div>

  <!-- пустая ячейка "плюс" -->
  <div v-else>
    <!--  -->
    <div v-if="other" @click="addFile">
      <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.24976 1.75993C8.24976 1.18806 8.47693 0.639616 8.8813 0.235244C9.15058 -0.0340385 9.91107 -0.0942015 10.1844 0.170928C10.206 0.191839 10.2278 0.21328 10.2498 0.235244C10.6541 0.639616 10.8813 1.18806 10.8813 1.75993V8.46537H17.1983C17.4814 8.46537 17.7618 8.52114 18.0234 8.6295C18.285 8.73786 18.5227 8.89669 18.723 9.09691C18.8835 9.4844 19.0173 9.93341 18.7457 10.253L18.723 10.2798C18.5227 10.48 18.285 10.6389 18.0234 10.7472C17.7618 10.8556 17.4814 10.9114 17.1983 10.9114H10.8813V17.1512C10.8813 17.7231 10.6541 18.2715 10.2498 18.6759C9.93953 18.9861 9.47791 19.1291 9.11939 18.8762C9.04033 18.8205 8.95969 18.7543 8.8813 18.6759C8.47693 18.2715 8.24976 17.7231 8.24976 17.1512V10.9114H1.80699C1.23512 10.9114 0.686674 10.6842 0.282302 10.2798C0.209118 10.2066 0.141738 10.1329 0.0804587 10.0612C-0.111286 9.83699 0.0736722 9.30554 0.282302 9.09691C0.686674 8.69254 1.23512 8.46537 1.80699 8.46537H8.24976V1.75993Z" fill="#242F9B"/>
      </svg>
    </div>
    <div v-else @click="addFile" class=" grid gap-2 justify-items-center px-2 py-[18px] rounded-[10px] border border-[#242F9B]">
      <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.24976 1.75993C8.24976 1.18806 8.47693 0.639616 8.8813 0.235244C9.15058 -0.0340385 9.91107 -0.0942015 10.1844 0.170928C10.206 0.191839 10.2278 0.21328 10.2498 0.235244C10.6541 0.639616 10.8813 1.18806 10.8813 1.75993V8.46537H17.1983C17.4814 8.46537 17.7618 8.52114 18.0234 8.6295C18.285 8.73786 18.5227 8.89669 18.723 9.09691C18.8835 9.4844 19.0173 9.93341 18.7457 10.253L18.723 10.2798C18.5227 10.48 18.285 10.6389 18.0234 10.7472C17.7618 10.8556 17.4814 10.9114 17.1983 10.9114H10.8813V17.1512C10.8813 17.7231 10.6541 18.2715 10.2498 18.6759C9.93953 18.9861 9.47791 19.1291 9.11939 18.8762C9.04033 18.8205 8.95969 18.7543 8.8813 18.6759C8.47693 18.2715 8.24976 17.7231 8.24976 17.1512V10.9114H1.80699C1.23512 10.9114 0.686674 10.6842 0.282302 10.2798C0.209118 10.2066 0.141738 10.1329 0.0804587 10.0612C-0.111286 9.83699 0.0736722 9.30554 0.282302 9.09691C0.686674 8.69254 1.23512 8.46537 1.80699 8.46537H8.24976V1.75993Z" fill="#242F9B"/>
      </svg>
      <span class=" text-[#242F9B] text-[12.4px] text-center">{{ title }}</span>

    </div>

    <!-- инпут для выбора файла -->
    <Field name="file" type="file">
      <input
  ref="fileInput"
  type="file"
  hidden
  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
  @change="loadFile"
/>
    </Field>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Field } from 'vee-validate'

const props = withDefaults(
  defineProps<{
    id?: string
    url?: string
    noimg?: boolean
    loading?: boolean
    other?: boolean,
    title?: string
  }>(),
  { noimg: true, loading: false, title: 'Документ' }
)

const fileInput = ref<HTMLInputElement | null>(null)

const emit = defineEmits<{
  (e: 'fileLoad', file: File): void
  (e: 'deleteFile', id: string): void
}>()

const addFile = () => {
  if (fileInput.value) fileInput.value.click()
}

const loadFile = (event: Event) => {
  const inputElement = event.target as HTMLInputElement
  if (inputElement.files && inputElement.files[0]) {
    emit('fileLoad', inputElement.files[0])
    inputElement.value = '' // сброс, чтобы можно было выбрать тот же файл
  }
}
</script>

<style lang="scss" scoped>
.file-img {
  @apply w-[76px] h-[76px] relative  rounded-[10px] grid place-content-center;
  & img {
    @apply rounded-[30px] w-full h-full absolute top-0 left-0 object-cover;
  }
  &__btn {
    @apply absolute -right-2 -top-2;
    z-index: 1;
  }
  &__url {
    
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    max-height: 50px;
    width: 80px;
    text-overflow: ellipsis;
  }
  &__spinner {
    @apply absolute inset-0 bg-black/40 flex items-center justify-center rounded-[30px];
  }
  &__spinner-icon {
    width: 32px;
    height: 32px;
  }
  .track {
    stroke: #e5e7eb;
  }
  .head {
    stroke: #ffffff;
    stroke-dasharray: 60;
    stroke-dashoffset: 20;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
