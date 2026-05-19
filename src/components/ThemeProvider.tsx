'use client';

import { useEffect } from 'react';
import { useThemeStore, resolveTheme } from '@/store/useThemeStore';

/**
 * 主题提供者组件
 * 负责在 html 元素上设置 data-theme 属性
 * 监听系统主题变化并动态更新
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme, setTheme, syncWithSystem } = useThemeStore();

  useEffect(() => {
    // 根据当前 theme 解析并同步 resolvedTheme
    // 依赖 theme 可确保 persist 恢复后或用户切换时都能正确解析
    const resolved = resolveTheme(theme);
    useThemeStore.setState({ resolvedTheme: resolved });
  }, [theme]);

  useEffect(() => {
    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      syncWithSystem();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [syncWithSystem]);

  useEffect(() => {
    // 在 html 元素上设置 data-theme 属性（使用解析后的主题）
    const html = document.documentElement;
    html.setAttribute('data-theme', resolvedTheme);

    // 同时设置 class 以兼容 Tailwind 的 dark mode
    html.classList.remove('light', 'dark', 'eye-care');
    html.classList.add(resolvedTheme);

    // 更新 body 背景色
    const config = useThemeStore.getState().getThemeConfig();
    document.body.style.backgroundColor = config.background;
    document.body.style.color = config.foreground;
  }, [resolvedTheme]);

  return <>{children}</>;
}
