import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as loginApi, register as registerApi, getUserInfo } from '@/api/auth';
import { updateUser as updateUserApi, deleteUser as deleteUserApi } from '@/api/user';

/**
 * 用户信息接口
 */
export interface User {
  id: number;
  email: string;
  userName: string;
  account: string;
  role: number;
  avatar?: string;
  nickname?: string;
  bio?: string;
  phone?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * 认证状态存储接口
 */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  setIsAuthenticated: (status: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => void;
  loginAction: (account: string, password: string) => Promise<void>;
  registerAction: (userName: string, email: string, password: string, code: string) => Promise<void>;
  updateProfileAction: (updates: Partial<User>) => Promise<void>;
  deleteAccountAction: () => Promise<void>;
  fetchUserInfoAction: () => Promise<void>;
  clearError: () => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user }),
      updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates, updateTime: new Date().toISOString() } : null,
    })),
      setIsAuthenticated: (status) => set({ isAuthenticated: status }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          document.cookie = 'auth=; path=/; max-age=0';
        }
        set({ user: null, isAuthenticated: false, error: null });
      },
      clearError: () => set({ error: null }),
      setError: (error: string | null) => set({ error }),

      loginAction: async (account: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await loginApi({ account, password });
          if (res.code === 200) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('token', res.data.token);
              document.cookie = 'auth=1; path=/; max-age=86400; SameSite=Lax';
            }
            const userData = res.data.user;
            set({
              user: userData ? {
                id: userData.id,
                email: userData.email || '',
                userName: userData.userName || '',
                account: userData.account || '',
                role: userData.role,
                createTime: userData.createTime,
                updateTime: userData.updateTime,
              } : null,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({ isLoading: false, error: res.message || '登录失败' });
          }
        } catch (err: unknown) {
          let message = '登录失败，请检查网络连接';
          if (err && typeof err === 'object' && 'message' in err && typeof (err as Record<string, unknown>).message === 'string') {
            message = (err as Record<string, string>).message;
          } else if (err instanceof Error) {
            message = err.message;
          }
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      registerAction: async (userName: string, email: string, password: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await registerApi({ userName, email, password, code });
          if (res.code === 200) {
            set({ isLoading: false, error: null });
          } else {
            set({ isLoading: false, error: res.message || '注册失败' });
          }
        } catch (err: unknown) {
          let message = '注册失败，请检查网络连接';
          if (err && typeof err === 'object' && 'message' in err && typeof (err as Record<string, unknown>).message === 'string') {
            message = (err as Record<string, string>).message;
          } else if (err instanceof Error) {
            message = err.message;
          }
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      updateProfileAction: async (updates: Partial<User>) => {
        set({ isLoading: true, error: null });
        try {
          const res = await updateUserApi(updates);
          if (res.code === 200) {
            set((state) => ({
              user: state.user ? { ...state.user, ...res.data, updateTime: new Date().toISOString() } : null,
              isLoading: false,
              error: null,
            }));
          } else {
            set({ isLoading: false, error: res.message || '更新失败' });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : '更新失败，请检查网络连接';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      deleteAccountAction: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await deleteUserApi();
          if (res.code === 200) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
            }
            set({ user: null, isAuthenticated: false, isLoading: false, error: null });
          } else {
            set({ isLoading: false, error: res.message || '注销失败' });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : '注销失败，请检查网络连接';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      fetchUserInfoAction: async () => {
        set({ isLoading: true });
        try {
          const res = await getUserInfo();
          if (res.code === 200) {
            set({ user: res.data, isAuthenticated: true, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state && state.isAuthenticated && !state.user) {
            useAuthStore.setState({ isAuthenticated: false, user: null });
          }
        };
      },
    }
  )
);
