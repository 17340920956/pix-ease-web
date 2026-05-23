import type { User } from '@/store/useAuthStore'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

const mockUser: User = {
  id: 1,
  email: 'test@pixease.com',
  userName: '测试用户',
  account: 'mock001',
  role: 0,
  nickname: 'PixEase测试员',
  bio: '热爱图片处理与创意设计的测试用户',
  phone: '13800138000',
  createTime: new Date().toISOString(),
  updateTime: new Date().toISOString(),
}

let currentUser: User = { ...mockUser }

const registeredUsers: { email: string; password: string; userName: string; code: string }[] = []

export function mockLogin(account: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const found = registeredUsers.find(
        (u) => (u.email === account || u.userName === account) && u.password === password
      )
      if (found) {
        const token = 'mock-token-' + Date.now()
        currentUser = {
          id: 2,
          email: found.email,
          userName: found.userName,
          account: 'mock' + Date.now().toString(36),
          role: 0,
          nickname: found.userName,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
        }
        resolve({ code: 200, message: 'success', data: { token, user: currentUser } })
      } else if (account === 'test@pixease.com' && password === '123456') {
        const token = 'mock-token-' + Date.now()
        currentUser = { ...mockUser }
        resolve({ code: 200, message: 'success', data: { token, user: { ...mockUser } } })
      } else {
        resolve({ code: 2004, message: '账号或密码错误', data: null as unknown as { token: string; user: User } })
      }
    }, 500)
  })
}

export function mockRegister(params: {
  userName: string
  email: string
  password: string
  code: string
}): Promise<ApiResponse<User>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (params.code !== '888888') {
        resolve({ code: 2005, message: '验证码错误', data: null as unknown as User })
        return
      }
      const exists = registeredUsers.find((u) => u.email === params.email)
      if (exists) {
        resolve({ code: 2006, message: '邮箱已注册', data: null as unknown as User })
        return
      }
      registeredUsers.push({
        email: params.email,
        password: params.password,
        userName: params.userName,
        code: params.code,
      })
      const user: User = {
        id: 2,
        email: params.email,
        userName: params.userName,
        account: 'mock' + Date.now().toString(36),
        role: 0,
        nickname: params.userName,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
      }
      resolve({ code: 200, message: 'success', data: user })
    }, 500)
  })
}

export function mockSendCode(email: string): Promise<ApiResponse<null>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ code: 200, message: '验证码已发送（mock: 888888）', data: null })
    }, 300)
  })
}

export function mockResetPassword(params: {
  email: string
  code: string
  password: string
}): Promise<ApiResponse<null>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (params.code !== '888888') {
        resolve({ code: 2005, message: '验证码错误', data: null })
        return
      }
      const found = registeredUsers.find((u) => u.email === params.email)
      if (found) {
        found.password = params.password
      }
      resolve({ code: 200, message: '密码重置成功', data: null })
    }, 500)
  })
}

export function mockGetUserInfo(): Promise<ApiResponse<User>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ code: 200, message: 'success', data: { ...currentUser } })
    }, 200)
  })
}

export function mockUpdateUser(updates: Partial<User>): Promise<ApiResponse<User>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      currentUser = { ...currentUser, ...updates, updateTime: new Date().toISOString() }
      resolve({ code: 200, message: 'success', data: { ...currentUser } })
    }, 300)
  })
}

export function mockDeleteUser(): Promise<ApiResponse<null>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      currentUser = { ...mockUser }
      resolve({ code: 200, message: '注销成功', data: null })
    }, 300)
  })
}