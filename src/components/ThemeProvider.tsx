'use client';

import { useEffect } from 'react';
import { useThemeStore, resolveTheme } from '@/store/useThemeStore';

/**
 * 主题提供者组件
 * 负责在 html 元素上设置 data-theme 属性
 * 监听系统主题变化并动态更新
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme } = useThemeStore();

  useEffect(() => {
    // 根据当前 theme 解析并同步 resolvedTheme
    // 依赖 theme 可确保 persist 恢复后或用户切换时都能正确解析
    const resolved = resolveTheme(theme);
    useThemeStore.setState({ resolvedTheme: resolved });
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      useThemeStore.getState().syncWithSystem();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', resolvedTheme);
    html.classList.remove('light', 'dark', 'eye-care');
    html.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  return <>{children}</>;
}
