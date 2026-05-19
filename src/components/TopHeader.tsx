'use client';

import Link from 'next/link';
import ThemeSwitcher from './ThemeSwitcher';
import ToolNavSwitcher from './ToolNavSwitcher';
import UserProfile from './UserProfile';

interface TopHeaderProps {
  children?: React.ReactNode;
}

const BrandLink = () => (
  <Link href="/" className="flex items-center gap-2">
    <div className="w-6 h-6 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded flex items-center justify-center">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
      </svg>
    </div>
    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>PixEase</span>
  </Link>
);

export default function TopHeader({ children }: TopHeaderProps) {
  return (
    <header
      className="px-4 py-2 flex items-center justify-between"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-center gap-2">
        <BrandLink />
        {children}
      </div>

      <div className="flex items-center gap-2">
        <div
          className="w-px h-6"
          style={{ backgroundColor: 'var(--border-color)' }}
        />
        <ThemeSwitcher />
        <ToolNavSwitcher />
        <UserProfile />
      </div>
    </header>
  );
}