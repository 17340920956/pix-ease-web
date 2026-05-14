'use client';

import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Eye, Palette } from 'lucide-react';
import { useThemeStore, type ThemeType } from '@/store/useThemeStore';

/**
 * 主题切换器组件
 * 支持明亮、黑夜、护眼三种主题切换
 */
export default function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions: { value: ThemeType; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: '明亮', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: '黑夜', icon: <Moon className="w-4 h-4" /> },
    { value: 'eye-care', label: '护眼', icon: <Eye className="w-4 h-4" /> },
  ];

  const currentOption = themeOptions.find((opt) => opt.value === theme);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors"
        style={{
          backgroundColor: 'var(--button-bg)',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
        }}
        title="切换主题"
      >
        <Palette className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">{currentOption?.label}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-36 rounded-xl overflow-hidden z-50"
          style={{
            backgroundColor: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setTheme(option.value);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
              style={{
                color: theme === option.value ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: theme === option.value ? 'var(--button-bg)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (theme !== option.value) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-hover-bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (theme !== option.value) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              <span
                style={{
                  color: theme === option.value ? 'var(--primary)' : 'var(--text-muted)',
                }}
              >
                {option.icon}
              </span>
              <span className="font-medium">{option.label}</span>
              {theme === option.value && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--primary)' }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
