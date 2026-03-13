
 

import { type DataObj, type EmployeeT, type ProfileT } from '../models/api';
import { api } from './index'

export const setFRB =  (
  token: string
) => {
  const body = new FormData()
  body.append('token', token)
  return api.mainKy.post('firebase/token', { body }).json()
}

export const uploadFile = (
  file: File
): Promise<DataObj<{  uuid: string; url: string } >> => {
  const body = new FormData()
  body.append('media', file)
  return api.mainKy.post('temp-media', { body }).json()
}
export const getEmployees = (): Promise<DataObj<EmployeeT[] >> => {
  return api.mainKy('employees').json()
}
export const getProfile = (): Promise<DataObj<ProfileT >> => {
  return api.mainKy('profile').json()
}