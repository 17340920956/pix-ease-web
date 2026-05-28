'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

interface AuthGuardProps {
  children: React.ReactNode;
  allowGuest?: boolean;
}

export default function AuthGuard({ children, allowGuest = false }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isGuest, isLoading } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const hasAccess = isAuthenticated || (allowGuest && isGuest);

  useEffect(() => {
    if (hydrated && !isLoading && !hasAccess && !allowGuest) {
      router.push('/login');
    }
  }, [hydrated, hasAccess, allowGuest, isLoading, router]);

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: 'var(--text-primary)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    if (allowGuest) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
          <div className="rounded-2xl p-8 text-center max-w-sm" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <p className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>此功能需要登录</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              登录或注册后即可使用全部功能
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              去登录
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: 'var(--text-primary)' }}>正在跳转到登录页面...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}