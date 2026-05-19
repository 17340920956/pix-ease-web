'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Eye, Palette, ChevronDown, Check } from 'lucide-react';
import { useThemeStore, type ThemeType } from '@/store/useThemeStore';
import { useDropdown } from '@/hooks/useDropdown';

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

const themeOptions: { value: ThemeType; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: '明亮', icon: <Sun className="w-4 h-4" /> },
  { value: 'dark', label: '黑夜', icon: <Moon className="w-4 h-4" /> },
  { value: 'eye-care', label: '护眼', icon: <Eye className="w-4 h-4" /> },
];

const labelMap: Record<string, string> = {
  light: '明亮',
  dark: '黑夜',
  'eye-care': '护眼',
};

export default function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore();
  const { isOpen, toggle, close, ref } = useDropdown();

  const displayLabel = labelMap[theme] || '明亮';

  return (
    <div className="relative" ref={ref}>
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        transition={springFast}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
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
        <span className="hidden sm:inline">{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-40 rounded-xl overflow-hidden z-50"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            }}
          >
            <div className="p-1">
              {themeOptions.map((option, i) => (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.15 }}
                  onClick={() => {
                    setTheme(option.value);
                    close();
                  }}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springFast}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
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
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
