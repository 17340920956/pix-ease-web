'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };
const springHover = { ...springFast };

interface DropdownOption {
  value: string;
  label: string;
}

interface AnimatedDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function AnimatedDropdown({ value, options, onChange, placeholder }: AnimatedDropdownProps) {
  const [open, setOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 关闭时重置 hover 状态
  useEffect(() => {
    if (!open) setHoveredIdx(null);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={springFast}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs border outline-none cursor-pointer"
        style={{
          backgroundColor: 'var(--background)',
          borderColor: open ? 'var(--primary)' : 'var(--input-border)',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        <span className="truncate">{selected?.label || placeholder || '请选择'}</span>
        <ChevronDown
          className="w-3 h-3 ml-2 flex-shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1.5 rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            }}
          >
            {options.map((opt, i) => {
              const isActive = opt.value === value;
              const isHovered = hoveredIdx === i && !isActive;
              return (
                <motion.button
                  key={opt.value}
                  type="button"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.15 }}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  whileHover={{ scale: 1.02, x: 2, transition: springHover }}
                  whileTap={{ scale: 0.97, transition: springHover }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="w-full px-3 py-2.5 text-xs text-left flex items-center justify-between"
                  style={{
                    backgroundColor: isActive ? 'var(--primary-light)' : isHovered ? 'var(--card-bg)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                  }}
                >
                  <span>{opt.label}</span>
                  {isActive && (
                    <span style={{ color: 'var(--primary)' }}>✓</span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
