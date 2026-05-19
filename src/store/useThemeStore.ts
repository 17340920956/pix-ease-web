import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 主题类型
 */
export type ThemeType = 'light' | 'dark' | 'eye-care' | 'auto';

/**
 * 实际应用的主题类型（auto 会被解析为 light 或 dark）
 */
export type ResolvedThemeType = 'light' | 'dark' | 'eye-care';

/**
 * 主题配置
 */
export interface ThemeConfig {
  /** 主题名称 */
  name: string;
  /** 背景色 */
  background: string;
  /** 前景色（文字） */
  foreground: string;
  /** 主色调 */
  primary: string;
  /** 主色悬停 */
  primaryHover: string;
  /** 次要色 */
  secondary: string;
  /** 强调色 */
  accent: string;
  /** 玻璃态背景 */
  glassBg: string;
  /** 玻璃态边框 */
  glassBorder: string;
  /** 玻璃态阴影 */
  glassShadow: string;
  /** 卡片背景 */
  cardBg: string;
  /** 渐变背景 */
  gradientBg: string;
  /** 边框颜色 */
  borderColor: string;
  /** 文字主色 */
  textPrimary: string;
  /** 文字次要色 */
  textSecondary: string;
  /** 文字muted */
  textMuted: string;
  /** 按钮背景 */
  buttonBg: string;
  /** 按钮悬停背景 */
  buttonHoverBg: string;
  /** 输入框背景 */
  inputBg: string;
  /** 输入框边框 */
  inputBorder: string;
  /** 危险色 */
  danger: string;
  /** 成功色 */
  success: string;
  /** 警告色 */
  warning: string;
  /** 信息色 */
  info: string;
  /** 滚动条颜色 */
  scrollbarColor: string;
}

/**
 * 主题配置映射
 */
export const THEME_CONFIGS: Record<ResolvedThemeType, ThemeConfig> = {
  light: {
    name: '明亮',
    background: '#f5f5f7',
    foreground: '#1d1d1f',
    primary: '#0071e3',
    primaryHover: '#0077ed',
    secondary: '#86868b',
    accent: '#bf5af2',
    glassBg: 'rgba(255, 255, 255, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    gradientBg: 'linear-gradient(180deg, #f5f5f7 0%, #ffffff 50%, #f5f5f7 100%)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    textPrimary: '#1d1d1f',
    textSecondary: '#86868b',
    textMuted: '#a1a1a6',
    buttonBg: 'rgba(0, 113, 227, 1)',
    buttonHoverBg: 'rgba(0, 119, 237, 1)',
    inputBg: 'rgba(255, 255, 255, 0.8)',
    inputBorder: '#d2d2d7',
    danger: '#ff3b30',
    success: '#34c759',
    warning: '#ff9500',
    info: '#0071e3',
    scrollbarColor: 'rgba(0, 0, 0, 0.15)',
  },
  dark: {
    name: '黑夜',
    background: '#000000',
    foreground: '#f5f5f7',
    primary: '#0a84ff',
    primaryHover: '#409cff',
    secondary: '#8e8e93',
    accent: '#bf5af2',
    glassBg: 'rgba(30, 30, 30, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
    cardBg: 'rgba(30, 30, 30, 0.85)',
    gradientBg: 'linear-gradient(180deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#f5f5f7',
    textSecondary: '#a1a1a6',
    textMuted: '#6e6e73',
    buttonBg: 'rgba(10, 132, 255, 1)',
    buttonHoverBg: 'rgba(64, 156, 255, 1)',
    inputBg: 'rgba(30, 30, 30, 0.8)',
    inputBorder: '#38383a',
    danger: '#ff453a',
    success: '#30d158',
    warning: '#ff9f0a',
    info: '#0a84ff',
    scrollbarColor: 'rgba(255, 255, 255, 0.15)',
  },
  'eye-care': {
    name: '护眼',
    background: '#f5f0e1',
    foreground: '#3d3d3d',
    primary: '#5a8f5a',
    primaryHover: '#4a7a4a',
    secondary: '#7a8a6a',
    accent: '#8a7a5a',
    glassBg: 'rgba(250, 247, 240, 0.7)',
    glassBorder: 'rgba(200, 190, 170, 0.5)',
    glassShadow: '0 8px 32px 0 rgba(100, 90, 70, 0.15)',
    cardBg: 'rgba(250, 247, 240, 0.85)',
    gradientBg: 'linear-gradient(135deg, #f5f0e1 0%, #e8e0d0 25%, #f0ebe0 50%, #e5ddd0 75%, #f5f0e1 100%)',
    borderColor: 'rgba(200, 190, 170, 0.4)',
    textPrimary: '#3d3d3d',
    textSecondary: '#5a5a5a',
    textMuted: '#8a8a8a',
    buttonBg: 'rgba(250, 247, 240, 0.6)',
    buttonHoverBg: 'rgba(240, 235, 225, 0.8)',
    inputBg: 'rgba(250, 247, 240, 0.6)',
    inputBorder: '#c8beaa',
    danger: '#c45c5c',
    success: '#5a9a5a',
    warning: '#c49a3a',
    info: '#5a8a9a',
    scrollbarColor: 'rgba(100, 90, 70, 0.3)',
  },
};

/**
 * 获取系统主题偏好
 */
export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * 解析主题（将 auto 转换为实际主题）
 */
export const resolveTheme = (theme: ThemeType): ResolvedThemeType => {
  if (theme === 'auto') {
    return getSystemTheme();
  }
  return theme;
};

/**
 * 主题状态接口
 */
interface ThemeState {
  /** 当前主题（可能为 auto） */
  theme: ThemeType;
  /** 解析后的实际主题 */
  resolvedTheme: ResolvedThemeType;
  /** 设置主题 */
  setTheme: (theme: ThemeType) => void;
  /** 切换下一个主题 */
  toggleTheme: () => void;
  /** 获取当前主题配置 */
  getThemeConfig: () => ThemeConfig;
  /** 从系统偏好更新主题 */
  syncWithSystem: () => void;
}

/**
 * 主题状态管理 Store
 * 使用 persist 中间件持久化到 localStorage
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'auto',
      resolvedTheme: 'light',
      setTheme: (theme) => {
        const resolved = resolveTheme(theme);
        set({ theme, resolvedTheme: resolved });
      },
      toggleTheme: () => {
        const themes: ThemeType[] = ['light', 'dark', 'eye-care', 'auto'];
        const currentIndex = themes.indexOf(get().theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        const resolved = resolveTheme(nextTheme);
        set({ theme: nextTheme, resolvedTheme: resolved });
      },
      getThemeConfig: () => THEME_CONFIGS[get().resolvedTheme],
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
