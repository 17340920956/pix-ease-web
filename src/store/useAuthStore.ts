import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 用户信息接口
 */
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  nickname?: string;
  bio?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 认证状态存储接口
 */
interface AuthState {
  /** 当前登录用户 */
  user: User | null;
  /** 登录状态 */
  isAuthenticated: boolean;
  /** 加载状态 */
  isLoading: boolean;
  /** 设置用户信息 */
  setUser: (user: User | null) => void;
  /** 更新用户信息字段 */
  updateUser: (updates: Partial<User>) => void;
  /** 设置登录状态 */
  setIsAuthenticated: (status: boolean) => void;
  /** 设置加载状态 */
  setIsLoading: (loading: boolean) => void;
  /** 登出 */
  logout: () => void;
}

/**
 * 用户认证状态管理 Store
 * 使用 Zustand 实现，支持持久化存储
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: (user) => set({ user }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates, updatedAt: new Date().toISOString() } : null,
        })),
      setIsAuthenticated: (status) => set({ isAuthenticated: status }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
