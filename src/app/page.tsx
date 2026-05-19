'use client';

import { motion } from 'framer-motion';
import {
  Sparkles,
  Image as ImageIcon,
  Film,
  FileType,
  Minimize2,
  Grid3x3,
  Type,
  ArrowRight,
  Shield,
  Zap,
  Lock,
  Heart,
  Layers,
  MousePointerClick,
  LogOut,
  LogIn,
  Palette,
} from 'lucide-react';
import Link from 'next/link';
import SkyBackground from '@/app/components/SkyBackground';
import { useAuthStore } from '@/store/useAuthStore';
import ThemeSwitcher from '@/components/ThemeSwitcher';

const currentYear = new Date().getFullYear();

const features = [
  {
    icon: <Film className="w-6 h-6" />,
    title: 'GIF 编辑器',
    description: '拆帧、合并、压缩、倒放',
    href: '/gif-editor',
    color: 'from-rose-400 to-orange-400',
    bgColor: 'bg-rose-50/80',
    iconColor: 'text-rose-500',
  },
  {
    icon: <FileType className="w-6 h-6" />,
    title: '格式转换',
    description: 'JPG、PNG、WEBP、AVIF',
    href: '/image-tool?type=convert',
    color: 'from-blue-400 to-cyan-400',
    bgColor: 'bg-blue-50/80',
    iconColor: 'text-blue-500',
  },
  {
    icon: <Minimize2 className="w-6 h-6" />,
    title: '图片压缩',
    description: '智能压缩，保持画质',
    href: '/image-tool?type=compress',
    color: 'from-emerald-400 to-teal-400',
    bgColor: 'bg-emerald-50/80',
    iconColor: 'text-emerald-500',
  },
  {
    icon: <Grid3x3 className="w-6 h-6" />,
    title: '像素风格',
    description: '像素风、GameBoy 风格',
    href: '/image-tool?type=pixelate',
    color: 'from-amber-400 to-yellow-400',
    bgColor: 'bg-amber-50/80',
    iconColor: 'text-amber-500',
  },
  {
    icon: <Type className="w-6 h-6" />,
    title: 'ASCII 艺术',
    description: '字符画转换',
    href: '/image-tool?type=ascii',
    color: 'from-violet-400 to-purple-400',
    bgColor: 'bg-violet-50/80',
    iconColor: 'text-violet-500',
  },
  {
    icon: <Palette className="w-6 h-6" />,
    title: '像素工坊',
    description: '像素画编辑器',
    href: '/pixel-studio',
    color: 'from-pink-400 to-rose-400',
    bgColor: 'bg-pink-50/80',
    iconColor: 'text-pink-500',
  },
];

const stats = [
  { value: '100%', label: '本地处理', icon: <Shield className="w-5 h-5" /> },
  { value: '0', label: '数据上传', icon: <Lock className="w-5 h-5" /> },
  { value: '50+', label: '支持格式', icon: <Layers className="w-5 h-5" /> },
  { value: '免费', label: '完全免费', icon: <Heart className="w-5 h-5" /> },
];

const highlights = [
  {
    icon: <Shield className="w-7 h-7" />,
    title: '隐私保护',
    description: '所有处理都在浏览器本地完成，图片不会上传到任何服务器',
    color: 'from-emerald-400 to-teal-400',
  },
  {
    icon: <Zap className="w-7 h-7" />,
    title: '极速处理',
    description: '采用 WebAssembly 技术，处理速度媲美原生应用',
    color: 'from-amber-400 to-orange-400',
  },
  {
    icon: <MousePointerClick className="w-7 h-7" />,
    title: '简单易用',
    description: '直观的操作界面，无需专业知识即可上手使用',
    color: 'from-blue-400 to-indigo-400',
  },
];

export default function Home() {
  const { isAuthenticated, logout } = useAuthStore();

  return (
    <div className="min-h-screen gradient-bg relative">
      <SkyBackground />

      {/* 导航栏 - 苹果风格 */}
      <nav className="nav-apple px-6 py-3 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-lg flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight">
              PixEase
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            {isAuthenticated ? (
              <button
                onClick={() => logout()}
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
                  e.currentTarget.style.backgroundColor = 'var(--button-bg)';
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>退出</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: '1px solid var(--primary)',
                }}
              >
                <LogIn className="w-4 h-4" />
                <span>登录</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero 区域 - 苹果风格大标题 */}
      <section className="relative pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <h1 className="text-5xl md:text-7xl font-semibold mb-6 leading-[1.1] tracking-tight">
              <span className="text-slate-800 dark:text-white">
                让图片处理
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                变得简单有趣
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
              PixEase 是一款功能强大的图片处理工具，支持 GIF 编辑、格式转换、图片压缩等多种功能。所有处理均在本地完成，保护您的隐私。
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/gif-editor"
                className="px-8 py-3.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full font-medium text-base transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                <Film className="w-5 h-5" />
                GIF编辑
              </Link>
              <Link
                href="/image-tool"
                className="px-8 py-3.5 glass-strong text-slate-700 dark:text-slate-200 rounded-full font-medium text-base transition-all hover:scale-[1.02] flex items-center gap-2"
              >
                <ImageIcon className="w-5 h-5" />
                图片工具
              </Link>
            </div>
          </motion.div>

          {/* 统计数据 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mt-16"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="glass rounded-2xl p-5 text-center"
              >
                <div className="flex justify-center mb-2 text-[#0071e3] dark:text-[#0a84ff]">
                  {stat.icon}
                </div>
                <div className="text-2xl font-semibold text-slate-800 dark:text-white">{stat.value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 功能区域 */}
      <section className="py-16 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-800 dark:text-white mb-3 tracking-tight">
              强大功能，一站搞定
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              无论是 GIF 编辑还是图片处理，PixEase 都能满足您的需求
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Link href={feature.href}>
                  <div className="glass-strong rounded-2xl p-6 h-full card-apple group">
                    <div
                      className={`w-11 h-11 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 ${feature.iconColor} transition-transform group-hover:scale-110`}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1.5">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{feature.description}</p>
                    <div className="flex items-center gap-1.5 text-sm text-[#0071e3] dark:text-[#0a84ff] font-medium">
                      立即使用
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 特性区域 */}
      <section className="py-16 px-6 relative">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {highlights.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                className="glass rounded-2xl p-6 text-center"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-md`}
                >
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-16 px-6 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto glass rounded-3xl p-12 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-semibold text-slate-800 dark:text-white mb-3 tracking-tight">
            准备好开始了吗？
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">
            立即体验 PixEase 的强大功能
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/gif-editor"
              className="px-8 py-3.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full font-medium transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/20"
            >
              开始编辑 GIF
            </Link>
            <Link
              href="/image-tool"
              className="px-8 py-3.5 glass-strong text-slate-700 dark:text-slate-200 rounded-full font-medium transition-all hover:scale-[1.02]"
            >
              探索图片工具
            </Link>
          </div>
        </motion.div>
      </section>

      {/* 底部 */}
      <footer className="border-t border-black/5 dark:border-white/5 px-6 py-10 relative">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-base font-semibold text-slate-800 dark:text-white">PixEase</span>
            </div>
            <div className="text-slate-400 dark:text-slate-500 text-sm">
              © {currentYear} PixEase
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
