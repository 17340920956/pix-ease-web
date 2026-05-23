import request from '@/utils/request'
import { mockUpdateUser, mockDeleteUser, type ApiResponse } from '@/mock'
import type { User } from '@/store/useAuthStore'

const USE_MOCK = false

export interface UpdateUserParams {
  userName?: string
  password?: string
  email?: string
  nickname?: string
  bio?: string
  phone?: string
}

export function updateUser(data: UpdateUserParams) {
  if (USE_MOCK) {
    return mockUpdateUser(data) as Promise<ApiResponse<User>>
  }
  return request.put<never, ApiResponse<User>>('/user/update', data)
}

export function deleteUser() {
  if (USE_MOCK) {
    return mockDeleteUser()
  }
  return request.delete<never, ApiResponse<null>>('/user/delete')
}