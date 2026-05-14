'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Image as ImageIcon, Film } from 'lucide-react';

/**
 * 工具导航切换器组件
 * 用于在 GIF 编辑器和静态图片处理工具之间切换
 */
export default function ToolNavSwitcher() {
  const pathname = usePathname();

  const tools = [
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
  ];

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl"
      style={{
        backgroundColor: 'var(--button-bg)',
        border: '1px solid var(--input-border)',
      }}
    >
      {tools.map((tool) => (
        <Link
          key={tool.href}
          href={tool.href}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: tool.active ? 'var(--primary)' : 'transparent',
            color: tool.active ? '#ffffff' : 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (!tool.active) {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--button-hover-bg)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!tool.active) {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)';
            }
          }}
        >
          {tool.icon}
          <span className="hidden sm:inline">{tool.label}</span>
        </Link>
      ))}
    </div>
  );
}
