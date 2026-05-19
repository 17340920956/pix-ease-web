import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'light' | 'dark' | 'eye-care' | 'auto';

export type ResolvedThemeType = 'light' | 'dark' | 'eye-care';

export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const resolveTheme = (theme: ThemeType): ResolvedThemeType => {
  if (theme === 'auto') {
    return getSystemTheme();
  }
  return theme;
};

interface ThemeState {
  theme: ThemeType;
  resolvedTheme: ResolvedThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  syncWithSystem: () => void;
}

/**
 * 主题状态管理 Store
 * 使用 persist 中间件持久化到 localStorage
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: (theme) => {
        const resolved = resolveTheme(theme);
        set({ theme, resolvedTheme: resolved });
      },
      toggleTheme: () => {
        const themes: ThemeType[] = ['light', 'dark', 'eye-care'];
        const currentIndex = themes.indexOf(get().theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        const resolved = resolveTheme(nextTheme);
        set({ theme: nextTheme, resolvedTheme: resolved });
      },
      syncWithSystem: () => {
        const state = get();
        if (state.theme === 'auto') {
          set({ resolvedTheme: getSystemTheme() });
        }
      },
    }),
    {
      name: 'pixease-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
