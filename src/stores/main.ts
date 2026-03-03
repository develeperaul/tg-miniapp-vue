import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { getChats } from '../api/chats'
import { getEmployees, getProfile } from '../api/main'
import type { EmployeeT, ProfileT } from '../models/api'
import { string } from 'yup'
import { useRoute, useRouter } from 'vue-router'
import { type DataVal } from '../models'
export const useMainStore = defineStore('main', () => {
  const route = useRoute();

  const load = ref(false);

  const profile = ref<ProfileT | null>(null);

  const setProfile = async () => {
    try {
      profile.value = (await getProfile()).data
    } catch (e) {
      throw e
    }
  }
  const employees = ref<DataVal<EmployeeT[]>>({ loading: false, data: [] })
  const employeesKeys = ref<{ [key: string]: string } | null>(null)
  const currentEmpl = ref<string|null>(null)
  const setEmploye = async () => {
    employees.value.loading = true
    try {
      employees.value.loading = false
      employees.value.data = (await getEmployees()).data
    } catch (e) {
      throw e
    }
    
    employees.value.data.forEach(e => {
      
      employeesKeys.value = {...employeesKeys.value, [e.type]: e.uuid }
    });
  }

  watch(
  () => route.meta,
  (val) => {
    
    
    if (val.hasOwnProperty("type") && employeesKeys.value ) {
      console.log(val.type);
      if (val.type === "message") {
        
      }else if ( employeesKeys.value[val.type]) {
        currentEmpl.value = employeesKeys.value[val.type]
      }
      
    }
    // React to the path change
  }

);
  watch(employeesKeys, (v) => {
    if (v && route.meta && route.meta.hasOwnProperty("type") && route.meta.type !== 'message') {
      currentEmpl.value = v[route.meta.type]
    }
  
  
})

  return {
    load,
    profile,
    setProfile,
    employees,
    employeesKeys,
    setEmploye,
    currentEmpl
  }
})
