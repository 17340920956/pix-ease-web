import request from '@/utils/request'
import {
  mockLogin,
  mockRegister,
  mockSendCode,
  mockResetPassword,
  mockGetUserInfo,
  type ApiResponse,
} from '@/mock'
import type { User } from '@/store/useAuthStore'

const USE_MOCK = false

export interface LoginParams {
  account: string
  password: string
}

export interface LoginResult {
  token: string
  user: User
}

export interface RegisterParams {
  userName: string
  email: string
  password: string
  code: string
}

export interface ResetPasswordParams {
  email: string
  code: string
  password: string
}

export function login(data: LoginParams) {
  if (USE_MOCK) {
    return mockLogin(data.account, data.password) as Promise<ApiResponse<LoginResult>>
  }
  return request.post<never, ApiResponse<LoginResult>>('/user/login', data)
}

export function register(data: RegisterParams) {
  if (USE_MOCK) {
    return mockRegister(data) as Promise<ApiResponse<User>>
  }
  return request.post<never, ApiResponse<User>>('/user/register', data)
}

export function sendCode(email: string) {
  if (USE_MOCK) {
    return mockSendCode(email)
  }
  return request.post<never, ApiResponse<null>>('/user/send-code', { email })
}

export function resetPassword(data: ResetPasswordParams) {
  if (USE_MOCK) {
    return mockResetPassword(data)
  }
  return request.post<never, ApiResponse<null>>('/user/reset-password', data)
}

export function getUserInfo() {
  if (USE_MOCK) {
    return mockGetUserInfo()
  }
  return request.get<never, ApiResponse<User>>('/user/info')
}