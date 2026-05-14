'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * 认证守卫组件
 * 用于保护需要登录才能访问的路由
 * 未登录用户会被重定向到登录页面
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // 如果未登录且不在加载状态，重定向到登录页
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 加载中或已登录时显示内容
  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-800 font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  // 未登录不渲染子组件（等待重定向）
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-800 font-medium">正在跳转到登录页面...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
