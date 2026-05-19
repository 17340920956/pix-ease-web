'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Image as ImageIcon, Film, Grid3x3, ChevronDown } from 'lucide-react';
import { useDropdown } from '@/hooks/useDropdown';

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
      <button
        onClick={toggle}
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
      >
        {activeTool.icon}
        <span className="hidden sm:inline">{activeTool.label}</span>
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
          {resolvedTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              onClick={close}
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
