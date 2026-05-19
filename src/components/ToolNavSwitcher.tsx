'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Film, Grid3x3, ChevronDown } from 'lucide-react';
import { useDropdown } from '@/hooks/useDropdown';

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

interface ToolItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

const tools: ToolItem[] = [
  {
    href: '/image-tool',
    label: '图片处理',
    icon: <ImageIcon className="w-4 h-4" />,
    active: false,
  },
  {
    href: '/gif-editor',
    label: 'GIF 编辑',
    icon: <Film className="w-4 h-4" />,
    active: false,
  },
  {
    href: '/pixel-studio',
    label: '像素工坊',
    icon: <Grid3x3 className="w-4 h-4" />,
    active: false,
  },
];

export default function ToolNavSwitcher() {
  const pathname = usePathname();
  const { isOpen, toggle, close, ref } = useDropdown();

  const resolvedTools: ToolItem[] = tools.map((t) => ({
    ...t,
    active: pathname === t.href || pathname?.startsWith(`${t.href}?`) || false,
  }));

  const activeTool = resolvedTools.find((t) => t.active) || resolvedTools[0];

  return (
    <div ref={ref} className="relative">
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
      >
        {activeTool.icon}
        <span className="hidden sm:inline">{activeTool.label}</span>
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
              {resolvedTools.map((tool, i) => (
                <motion.div
                  key={tool.href}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.15 }}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Link
                    href={tool.href}
                    onClick={close}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{
                      backgroundColor: tool.active ? 'var(--primary)' : 'transparent',
                      color: tool.active ? '#ffffff' : 'var(--text-primary)',
                    }}
                    onMouseEnter={(e) => {
                      if (!tool.active) {
                        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--button-bg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!tool.active) {
                        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {tool.icon}
                    <span>{tool.label}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
