'use client';

import { motion } from 'framer-motion';
import {
  Sparkles,
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
  MousePointerClick,
  LogIn,
  LogOut,
  Palette,
} from 'lucide-react';
import Link from 'next/link';
import SkyBackground from '@/app/components/SkyBackground';
import { useAuthStore } from '@/store/useAuthStore';
import ThemeSwitcher from '@/components/ThemeSwitcher';

const currentYear = new Date().getFullYear();

const springApple = { type: 'spring' as const, stiffness: 350, damping: 28, mass: 0.8 };
const springGentle = { type: 'spring' as const, stiffness: 180, damping: 22, mass: 0.9 };

const features = [
  {
    icon: <Film className="w-5 h-5" />,
    title: 'GIF 编辑器',
    description: '拆帧、合并、压缩、倒放，轻松编辑动态图片',
    href: '/gif-editor',
    gradient: 'from-rose-500 to-orange-400',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
  },
  {
    icon: <FileType className="w-5 h-5" />,
    title: '格式转换',
    description: 'JPG、PNG、WEBP、AVIF 等主流格式互转',
    href: '/image-tool?type=convert',
    gradient: 'from-blue-500 to-cyan-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    icon: <Minimize2 className="w-5 h-5" />,
    title: '图片压缩',
    description: '智能压缩算法，保持画质的同时大幅减小体积',
    href: '/image-tool?type=compress',
    gradient: 'from-emerald-500 to-teal-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    icon: <Grid3x3 className="w-5 h-5" />,
    title: '像素风格',
    description: '一键转换像素风、GameBoy 复古风格',
    href: '/image-tool?type=pixelate',
    gradient: 'from-amber-500 to-yellow-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    icon: <Type className="w-5 h-5" />,
    title: 'ASCII 艺术',
    description: '将图片转换为字符画，创造独特艺术效果',
    href: '/image-tool?type=ascii',
    gradient: 'from-violet-500 to-purple-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
  },
  {
    icon: <Palette className="w-5 h-5" />,
    title: '像素工坊',
    description: '像素画编辑器，支持图层与动画',
    href: '/pixel-studio',
    gradient: 'from-pink-500 to-rose-400',
    bg: 'bg-pink-50 dark:bg-pink-500/10',
  },
];

const stats = [
  { value: '100%', label: '本地处理', icon: <Shield className="w-4 h-4" /> },
  { value: '0', label: '数据上传', icon: <Lock className="w-4 h-4" /> },
  { value: '免费', label: '完全免费', icon: <Heart className="w-4 h-4" /> },
];

const highlights = [
  {
    icon: <Shield className="w-6 h-6" />,
    title: '隐私保护',
    description: '所有处理都在浏览器本地完成，图片不会上传到任何服务器，确保数据安全',
    gradient: 'from-emerald-400 to-teal-400',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: '快速处理',
    description: '基于浏览器原生能力，快速完成图片处理',
    gradient: 'from-amber-400 to-orange-400',
  },
  {
    icon: <MousePointerClick className="w-6 h-6" />,
    title: '简单易用',
    description: '直观的操作界面，拖拽即用，轻松上手',
    gradient: 'from-blue-400 to-indigo-400',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springApple, delay: i * 0.06 },
  }),
};

export default function Home() {
  const { isAuthenticated, logout } = useAuthStore();

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--background)' }}>
      <SkyBackground />

      {/* 导航栏 */}
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springApple, delay: 0.08 }}
        className="sticky top-0 z-50 backdrop-blur-2xl"
        style={{ backgroundColor: 'var(--glass-bg)', borderBottom: '1px solid var(--glass-border)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={springApple}
              className="w-8 h-8 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-lg flex items-center justify-center shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
            <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              PixEase
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            {isAuthenticated ? (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                style={{ backgroundColor: 'var(--button-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
              >
                <LogOut className="w-4 h-4" />
                <span>退出</span>
              </motion.button>
            ) : (
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium text-white"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <LogIn className="w-4 h-4" />
                  <span>登录</span>
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative pt-24 md:pt-32 pb-16 md:pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: 0.15 }}
          >
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springApple, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.08] tracking-tight"
            >
              <span style={{ color: 'var(--text-primary)' }}>
                让图片处理
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
                简单而强大
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springApple, delay: 0.35 }}
              className="text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              所有处理均在本地浏览器完成，保护隐私。支持 GIF 编辑、格式转换、图片压缩、像素工坊等功能。
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springApple, delay: 0.5 }}
              className="flex flex-wrap gap-4 justify-center"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/pixel-studio"
                  className="px-7 py-3.5 rounded-full font-medium text-base text-white shadow-lg shadow-blue-500/20 flex items-center gap-2"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <Palette className="w-5 h-5" />
                  像素工坊
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/image-tool"
                  className="px-7 py-3.5 rounded-full font-medium text-base flex items-center gap-2"
                  style={{ backgroundColor: 'var(--button-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
                >
                  <Sparkles className="w-5 h-5" />
                  探索工具
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springApple, delay: 0.65 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto mt-20"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ ...springApple, delay: 0.75 + index * 0.08 }}
                whileHover={{ y: -4, scale: 1.04 }}
                className="rounded-2xl p-4 text-center cursor-default"
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex justify-center mb-1.5" style={{ color: 'var(--primary)' }}>
                  {stat.icon}
                </div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={springGentle}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              常用功能，一站搞定
            </h2>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              无论是 GIF 编辑还是图片处理，PixEase 都能满足您的需求
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                whileHover={{ y: -8, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link href={feature.href}>
                  <div
                    className="rounded-2xl p-6 h-full cursor-pointer"
                    style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
                  >
                    <div className={`w-10 h-10 ${feature.bg} rounded-xl flex items-center justify-center mb-4`}>
                      <div className={`bg-gradient-to-br ${feature.gradient} bg-clip-text text-transparent`}>
                        {feature.icon}
                      </div>
                    </div>
                    <h3 className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                      {feature.description}
                    </p>
                    <div className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--primary)' }}>
                      立即体验
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20 px-6" style={{ backgroundColor: 'var(--button-bg)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={springGentle}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              为什么选择 PixEase
            </h2>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              安全、快速、简单
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {highlights.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ ...springApple, delay: index * 0.1 }}
                whileHover={{ y: -6, scale: 1.03 }}
                className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center text-white mx-auto mb-5 shadow-md`}
                >
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={springGentle}
          className="max-w-xl mx-auto rounded-3xl p-12 text-center"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            准备好开始了吗？
          </h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            免费使用，无需下载，打开浏览器即可开始创作
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/pixel-studio"
                className="px-7 py-3.5 rounded-full font-medium text-white shadow-lg shadow-blue-500/20 animate-subtle-pulse"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                打开像素工坊
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/image-tool"
                className="px-7 py-3.5 rounded-full font-medium"
                style={{ backgroundColor: 'var(--button-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
              >
                图片工具
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={springApple}
              className="flex items-center gap-2.5"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>PixEase</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...springApple, delay: 0.1 }}
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              © {currentYear} PixEase. 保留所有权利。
            </motion.div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="/privacy" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>隐私政策</Link>
            <Link href="/terms" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>服务条款</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}