<template>
  <div class="px-5 pt-5 pb-3 space-y-4">
    <header class="flex items-start gap-3">
      <div
        class="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center"
      >
        <img src="/icons/accountant.svg" alt="" class="w-6 h-6" />
      </div>
      <div>
        <h1 class="text-xl font-semibold">Бухгалтер</h1>
        <p class="text-[11px] text-muted">
          Краткое описание роли бухгалтера в мини-приложении.
        </p>
      </div>
    </header>

    <section class="bg-white rounded-2xl p-4 space-y-2">
      <h2 class="text-sm font-semibold">Задачи бухгалтера</h2>
      <p class="text-[11px] text-muted leading-snug">
        По макету: контроль оплат, сверка счетов, работа с отчётами и финансовыми показателями.
      </p>
    </section>

    <section class="bg-white rounded-2xl p-4 space-y-3">
      <h2 class="text-sm font-semibold">Что он видит в мини-апе</h2>
      <ul class="space-y-2 text-[11px] text-muted">
        <li class="flex gap-2">
          <span class="mt-[2px] inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
          <span>Сводку по оплатам и задолженностям.</span>
        </li>
        <li class="flex gap-2">
          <span class="mt-[2px] inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
          <span>Список счетов / актов с фильтрами.</span>
        </li>
        <li class="flex gap-2">
          <span class="mt-[2px] inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
          <span>Экспорт / отправка отчётов ответственным.</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
</script>
