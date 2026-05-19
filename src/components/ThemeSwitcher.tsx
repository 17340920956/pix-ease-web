'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sun, Moon, Eye, Palette, ChevronDown, Check } from 'lucide-react';
import { useThemeStore, type ThemeType } from '@/store/useThemeStore';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen]);

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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
        style={{
          backgroundColor: 'var(--button-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--input-border)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--button-hover-bg)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'var(--button-bg)';
          }
        }}
        title="切换主题"
      >
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline">{currentOption?.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 rounded-xl py-1 shadow-lg z-50 min-w-[140px]"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
          }}
        >
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setTheme(option.value);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
              style={{
                backgroundColor: theme === option.value ? 'var(--primary)' : 'transparent',
                color: theme === option.value ? '#ffffff' : 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                if (theme !== option.value) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--button-bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (theme !== option.value) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              {option.icon}
              <span className="font-medium">{option.label}</span>
              {theme === option.value && (
                <Check className="w-3.5 h-3.5 ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
