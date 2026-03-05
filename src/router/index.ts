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
import { getAccessToken } from '../api/tokens'
import { useMainStore } from '../stores/main'
import PodisForm from '../views/PodisForm.vue'
const routes = [
  { path: '', name: 'Home', component: HomeView, meta: {auth: true} },
  { path: '/auth', name: 'Auth', component: AuthView },
  { path: '/fns', name: 'FNS', component: FNS,  meta: { type: 'lawyer',auth: true} },
  { path: '/dialogs', name: 'DialogsList', component: DialogsList, meta: {auth: true} },
  { path: '/dialogs/:uuid', props: true, name: 'Dialog', component: DialogView },
  {
    path: '/operator', component: MainLayout, meta: { type: 'manager' }, children: [
      { path: '/', name: 'Operator', component: OperatorView},
      { path: 'create', name: 'Order',  component: CreateOrderView },
      
    ] },
  { path: '/form/:type:title', props: true, name: 'Form1', component: Form1, meta: {auth: true} },
  {
    path: '/buhg', component: MainLayout, meta: { type: 'accountant', auth: true }, children: [
      { path: '', name: 'Buhg', component: BuhgView},
      { path: '/numb-upd', name: 'NumbUPD', component: NumbUPDView},
      { path: '/podpis', name: 'PodisForm', component: PodisForm},
      // { path: 'buhg-form/:type', props: true, name: 'BuhgForm', component: BuhgForm },
      // { path: '/bum-upd', name: 'BumUPD', component: BumUPDView, meta: {type: 'accountant'} },
    
  ] },
  
  
  
  { path: '/buhg-form', name: 'BuhgForm', component: BuhgForm, meta: {auth: true} },
  { path: '/accountant', name: 'Accountant', component: AccountantView, meta: {auth: true} }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})


router.beforeEach(async (to, from, next) => {

  console.log(getAccessToken());
  if (to.meta && to.meta.auth) { 

    if (getAccessToken()) {
      if (from.name === 'Auth') {
        await useMainStore().setProfile()
        await useMainStore().setEmploye()
        await useChatsStore().setChats()
      }
      if (from.name === 'Dialog') {
        await useChatsStore().setChats()
      }

      return next();
      
    }
    else {
      
      next({ name: 'Auth' })
    }
  }
  
  return next()

    

  
  
 })
export default router
