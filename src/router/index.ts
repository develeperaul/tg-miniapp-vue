import { createRouter, createWebHistory } from 'vue-router'

import AuthView from '../views/AuthView.vue'
import HomeView from '../views/HomeView.vue'
import OperatorView from '../views/OperatorView.vue'
import CreateOrderView from '../views/CreateOrderView.vue'
import NumbUPDView from '../views/NumbUPDView.vue'
import BumUPDView from '../views/BumUPDView.vue'
import BuhgView from '../views/BuhgView.vue'
import BuhgForm from '../views/BuhgForm.vue'
import Form1 from '../views/Form1.vue'
import AccountantView from '../views/AccountantView.vue'
import DialogsList from '../views/DialogsList.vue'
import DialogView from '../views/DialogView.vue'
import FNS from '../views/FNS.vue'
import MainLayout from '../layouts/MainLayout.vue'
import { useChatsStore } from '../stores/chats'
import { usePinCode } from '../composables/usePinCode'
import { getAccessToken } from '../api/tokens'
import { useMainStore } from '../stores/main'
import PodisForm from '../views/PodisForm.vue'
import { setupFirebaseMessaging } from '../composables/useFirebaseMessaging'
import PinCodeView from '../views/PinCodeView.vue'

const routes = [
  { 
    path: '', 
    name: 'Home', 
    component: HomeView, 
    meta: { auth: true, requiresPin: true } // requiresPin вместо requiresPinAuth
  },
  { 
    path: '/auth', 
    name: 'Auth', 
    component: AuthView 
  },
  { 
    path: '/fns', 
    name: 'FNS', 
    component: FNS,  
    meta: { type: 'lawyer', auth: true, requiresPin: true }
  },
  { 
    path: '/dialogs', 
    name: 'DialogsList', 
    component: DialogsList, 
    meta: { auth: true, requiresPin: true }
  },
  { 
    path: '/dialogs/:uuid', 
    props: true, 
    name: 'Dialog', 
    component: DialogView,
    meta: { auth: true, requiresPin: true } // Добавил, так как диалог тоже защищен
  },
  {
    path: '/operator', 
    component: MainLayout, 
    meta: { type: 'manager', auth: true, requiresPin: true }, 
    children: [
      { path: '/', name: 'Operator', component: OperatorView },
      { path: 'create', name: 'Order', component: CreateOrderView },
    ] 
  },
  { 
    path: '/form/:type:title', 
    props: true, 
    name: 'Form1', 
    component: Form1, 
    meta: { auth: true, requiresPin: true }
  },
  {
    path: '/buhg', 
    component: MainLayout, 
    meta: { type: 'accountant', auth: true, requiresPin: true }, 
    children: [
      { path: '', name: 'Buhg', component: BuhgView },
      { path: '/numb-upd', name: 'NumbUPD', component: NumbUPDView },
      { path: '/podpis', name: 'PodisForm', component: PodisForm },
    ] 
  },
  {
    path: '/pin',
    name: 'PinCode',
    component: PinCodeView,
    meta: { auth: false, requiresPin: false } // всегда доступен
  },
  { 
    path: '/buhg-form', 
    name: 'BuhgForm', 
    component: BuhgForm, 
    meta: { auth: true, requiresPin: true }
  },
  { 
    path: '/accountant', 
    name: 'Accountant', 
    component: AccountantView, 
    meta: { auth: true, requiresPin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// router/index.ts
router.beforeEach(async (to, from, next) => {
  console.log('📍 Навигация:', { 
    to: to.name, 
    from: from.name,
    token: getAccessToken() ? 'есть' : 'нет'
  })

  const { 
    isSessionAuthenticated, 
    hasPin, 
    shouldForcePinSet,
    setForcePinSet 
  } = usePinCode()
  
  // 1. Если маршрут требует авторизации
  if (to.meta?.auth) {
    // Проверяем наличие токена
    if (!getAccessToken()) {
      console.log('→ Нет токена, редирект на Auth')
      return next({ name: 'Auth' })
    }

    // Загружаем данные при первом входе
    if (from.name === 'Auth') {
      console.log('→ Первый вход после авторизации')
      await useMainStore().setProfile()
      await useMainStore().setEmploye()
      await useChatsStore().setChats()
      await setupFirebaseMessaging()
      
      // 🆕 Устанавливаем флаг, что нужно создать пин-код
      setForcePinSet()
      console.log('→ Установлен флаг принудительной установки пина')
    }
    
    if (from.name === 'Dialog') {
      await useChatsStore().setChats()
    }

    // 🆕 Проверяем, нужно ли принудительно установить пин
    if (shouldForcePinSet()) {
      console.log('→ Требуется принудительная установка пина')
      return next({ 
        name: 'PinCode',
        query: { mode: 'force', redirect: to.fullPath }
      })
    }

    // 2. Проверяем пин-код (если требуется)
    if (to.meta?.requiresPin) {
      console.log('→ Маршрут требует пин-код:', {
        sessionAuth: isSessionAuthenticated(),
        hasPin: hasPin()
      })

      // Если пин-код уже введен в этой сессии
      if (isSessionAuthenticated()) {
        console.log('→ Пин-код уже введен в сессии, пропускаем')
        return next()
      }

      // Если пин-код установлен, но не введен в сессии
      if (hasPin()) {
        console.log('→ Пин-код установлен, но не введен → на PinCode')
        return next({ 
          name: 'PinCode',
          query: { mode: 'enter', redirect: to.fullPath }
        })
      }

      // Если пин-код еще не установлен
      console.log('→ Пин-код не установлен → на PinCode для установки')
      
      return next({ 
        name: 'PinCode',
        query: { mode: 'setup', redirect: to.fullPath }
      })
    }

    return next()
  }

  // 3. Для страниц без авторизации
  if ((to.name === 'Auth' || to.name === 'PinCode') && 
      getAccessToken() && 
      isSessionAuthenticated()) {
    return next({ name: 'Home' })
  }

  return next()
})

export default router
// router.beforeEach(async (to, from, next) => {

//   console.log(getAccessToken());
//   if (to.meta && to.meta.auth) { 

//     if (getAccessToken()) {
//       if (from.name === 'Auth') {
//         await useMainStore().setProfile()
//         await useMainStore().setEmploye()
//         await useChatsStore().setChats()
//         await setupFirebaseMessaging()
//       }
//       if (from.name === 'Dialog') {
//         await useChatsStore().setChats()
//       }

//       return next();
      
//     }
//     else {
      
//       next({ name: 'Auth' })
//     }
//   }
  
//   return next()

    

  
  
//  })
