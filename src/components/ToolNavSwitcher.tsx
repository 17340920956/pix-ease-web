'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Film, Grid3x3, ChevronDown } from 'lucide-react';

interface ToolItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

export default function ToolNavSwitcher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const tools: ToolItem[] = [
    {
      href: '/image-tool',
      label: '图片处理',
      icon: <ImageIcon className="w-4 h-4" />,
      active: pathname === '/image-tool' || pathname?.startsWith('/image-tool'),
    },
    {
      href: '/gif-editor',
      label: 'GIF 编辑',
      icon: <Film className="w-4 h-4" />,
      active: pathname === '/gif-editor' || pathname?.startsWith('/gif-editor'),
    },
    {
      href: '/pixel-studio',
      label: '像素工坊',
      icon: <Grid3x3 className="w-4 h-4" />,
      active: pathname === '/pixel-studio' || pathname?.startsWith('/pixel-studio'),
    },
  ];

  const activeTool = tools.find((t) => t.active) || tools[0];

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
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
          if (!open) {
            e.currentTarget.style.backgroundColor = 'var(--button-bg)';
          }
        }}
      >
        {activeTool.icon}
        <span className="hidden sm:inline">{activeTool.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-xl py-1 shadow-lg z-50 min-w-[140px]"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
          }}
        >
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm transition-colors"
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
          ))}
        </div>
      )}
    </div>
  );
}
