'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
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
  MousePointerClick,
  LogIn,
  LogOut,
  Palette,
  Image,
  Upload,
  Download,
  Layers,
  Wand2,
  Star,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import SkyBackground from '@/app/components/SkyBackground';
import { useAuthStore } from '@/store/useAuthStore';
import ThemeSwitcher from '@/components/ThemeSwitcher';

const currentYear = new Date().getFullYear();

const springApple = { type: 'spring' as const, stiffness: 350, damping: 28, mass: 0.8 };
const springGentle = { type: 'spring' as const, stiffness: 180, damping: 22, mass: 0.9 };

const floatingIcons = [
  { icon: <Image className="w-6 h-6" />, x: '15%', y: '20%', delay: 0 },
  { icon: <Film className="w-5 h-5" />, x: '80%', y: '15%', delay: 1.5 },
  { icon: <Palette className="w-5 h-5" />, x: '25%', y: '70%', delay: 0.8 },
  { icon: <Grid3x3 className="w-4 h-4" />, x: '75%', y: '65%', delay: 2.2 },
  { icon: <Wand2 className="w-5 h-5" />, x: '90%', y: '45%', delay: 1.2 },
  { icon: <Star className="w-4 h-4" />, x: '10%', y: '50%', delay: 3 },
  { icon: <Layers className="w-4 h-4" />, x: '60%', y: '80%', delay: 2.8 },
  { icon: <Type className="w-4 h-4" />, x: '40%', y: '30%', delay: 3.5 },
];

const features = [
  {
    icon: <Film className="w-6 h-6" />,
    title: 'GIF 编辑器',
    description: '拆帧、合并、压缩、倒放，轻松掌控动态图片的每一帧',
    href: '/gif-editor',
    gradient: 'from-rose-500 to-orange-400',
    bgLight: 'bg-rose-50',
    bgDark: 'bg-rose-500/10',
    shadow: 'shadow-rose-500/10',
  },
  {
    icon: <FileType className="w-6 h-6" />,
    title: '格式转换',
    description: '支持 JPG、PNG、WEBP、AVIF 等主流格式互转，一键完成',
    href: '/image-tool?type=convert',
    gradient: 'from-blue-500 to-cyan-400',
    bgLight: 'bg-blue-50',
    bgDark: 'bg-blue-500/10',
    shadow: 'shadow-blue-500/10',
  },
  {
    icon: <Minimize2 className="w-6 h-6" />,
    title: '图片压缩',
    description: '智能压缩算法，保持高清画质的同时大幅减小文件体积',
    href: '/image-tool?type=compress',
    gradient: 'from-emerald-500 to-teal-400',
    bgLight: 'bg-emerald-50',
    bgDark: 'bg-emerald-500/10',
    shadow: 'shadow-emerald-500/10',
  },
  {
    icon: <Grid3x3 className="w-6 h-6" />,
    title: '像素风格',
    description: '一键转换像素艺术风格，支持 GameBoy 等复古滤镜效果',
    href: '/image-tool?type=pixelate',
    gradient: 'from-amber-500 to-yellow-400',
    bgLight: 'bg-amber-50',
    bgDark: 'bg-amber-500/10',
    shadow: 'shadow-amber-500/10',
  },
  {
    icon: <Type className="w-6 h-6" />,
    title: 'ASCII 艺术',
    description: '将图片转换为字符画，探索文字与图像的创意边界',
    href: '/image-tool?type=ascii',
    gradient: 'from-violet-500 to-purple-400',
    bgLight: 'bg-violet-50',
    bgDark: 'bg-violet-500/10',
    shadow: 'shadow-violet-500/10',
  },
  {
    icon: <Palette className="w-6 h-6" />,
    title: '像素工坊',
    description: '专业像素画编辑器，支持多图层与帧动画创作',
    href: '/pixel-studio',
    gradient: 'from-pink-500 to-rose-400',
    bgLight: 'bg-pink-50',
    bgDark: 'bg-pink-500/10',
    shadow: 'shadow-pink-500/10',
    highlight: true,
  },
];

const steps = [
  {
    step: '01',
    icon: <Upload className="w-6 h-6" />,
    title: '上传图片',
    description: '拖拽或选择本地图片，支持多种格式',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    step: '02',
    icon: <Wand2 className="w-6 h-6" />,
    title: '选择处理',
    description: '选择需要的编辑或转换功能，实时预览',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    step: '03',
    icon: <Download className="w-6 h-6" />,
    title: '下载结果',
    description: '处理完成后直接下载，全程本地运算',
    gradient: 'from-emerald-500 to-teal-500',
  },
];

const advantages = [
  {
    icon: <Shield className="w-7 h-7" />,
    title: '隐私安全',
    description: '所有图片处理在浏览器本地完成，数据不会上传至任何服务器，从源头保障您的隐私安全',
    gradient: 'from-emerald-400 to-teal-400',
  },
  {
    icon: <Zap className="w-7 h-7" />,
    title: '极速响应',
    description: '基于 WebAssembly 与浏览器原生 API，毫秒级处理响应，无需等待云端计算',
    gradient: 'from-amber-400 to-orange-400',
  },
  {
    icon: <MousePointerClick className="w-7 h-7" />,
    title: '开箱即用',
    description: '无需安装任何软件，打开浏览器即可使用。简洁直观的界面设计，零学习成本',
    gradient: 'from-blue-400 to-indigo-400',
  },
  {
    icon: <Lock className="w-7 h-7" />,
    title: '完全免费',
    description: '所有功能完全免费开放，无隐藏收费。不限制使用次数与处理数量',
    gradient: 'from-violet-400 to-purple-400',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springApple, delay: i * 0.08 },
  }),
};

export default function Home() {
  const { isAuthenticated, logout } = useAuthStore();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.92]);
  const heroY = useTransform(scrollYProgress, [0, 0.6], [0, 40]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <SkyBackground />

      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springApple, delay: 0.05 }}
        className="sticky top-0 z-50 backdrop-blur-2xl"
        style={{ backgroundColor: 'var(--glass-bg)', borderBottom: '1px solid var(--glass-border)' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ scale: 1.12, rotate: 8 }}
              transition={springApple}
              className="w-9 h-9 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20"
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--button-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
              >
                <LogOut className="w-4 h-4" />
                <span>退出登录</span>
              </motion.button>
            ) : (
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
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

      {/* ===== Hero Section ===== */}
      <section ref={heroRef} className="relative pt-20 md:pt-36 pb-24 md:pb-36 px-6">
        {/* Floating decorative icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {floatingIcons.map((item, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{ left: item.x, top: item.y }}
              animate={{
                y: [0, -12, 0, 8, 0],
                rotate: [0, 5, -3, 2, 0],
              }}
              transition={{
                duration: 5 + i,
                repeat: Infinity,
                delay: item.delay,
                ease: 'easeInOut',
              }}
            >
              <div className="opacity-15 dark:opacity-10" style={{ color: 'var(--text-secondary)' }}>
                {item.icon}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springApple, delay: 0.18 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-8 leading-[1.06] tracking-tight"
          >
            <span style={{ color: 'var(--text-primary)' }}>
              图片处理，
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              从未如此简单
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: 0.35 }}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            无需上传，所有处理均在浏览器本地完成。支持 GIF 编辑、格式转换、图片压缩、
            像素工坊等十余种专业级图像处理工具。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springApple, delay: 0.5 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
              <Link
                href="/pixel-studio"
                className="px-8 py-4 rounded-2xl font-semibold text-base text-white shadow-xl inline-flex items-center gap-2.5 group"
                style={{
                  backgroundColor: 'var(--primary)',
                  boxShadow: '0 8px 32px color-mix(in srgb, var(--primary) 30%, transparent)',
                }}
              >
                <Palette className="w-5 h-5" />
                <span>打开像素工坊</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
              <Link
                href="/image-tool"
                className="px-8 py-4 rounded-2xl font-semibold text-base inline-flex items-center gap-2.5"
                style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)' }}
              >
                <Sparkles className="w-5 h-5" />
                <span>探索全部工具</span>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ===== Trust Badges ===== */}
      <section className="pb-8 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={springGentle}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {[
              { value: '100%', label: '本地处理', sub: '不上传服务器', icon: <Shield className="w-4 h-4" /> },
              { value: '10+', label: '实用工具', sub: '满足各类需求', icon: <Wand2 className="w-4 h-4" /> },
              { value: '免费', label: '完全免费', sub: '无任何隐藏收费', icon: <Star className="w-4 h-4" /> },
              { value: '毫秒级', label: '极速响应', sub: '无需等待', icon: <Zap className="w-4 h-4" /> },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.85, y: 16 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...springApple, delay: i * 0.08 }}
                whileHover={{ y: -4, scale: 1.03 }}
                className="rounded-2xl p-5 text-center cursor-default transition-shadow"
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <motion.div
                  className="flex justify-center mb-2"
                  style={{ color: 'var(--primary)' }}
                  whileHover={{ rotate: -5, scale: 1.15 }}
                >
                  {stat.icon}
                </motion.div>
                <div className="text-2xl font-extrabold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                  {stat.value}
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stat.sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== How It Works ===== */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={springGentle}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
              style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}
            >
              三步完成
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              简单三步，即刻处理
            </h2>
            <p className="text-lg max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
              无需注册也能使用核心功能，打开浏览器即可开始
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5" style={{ backgroundColor: 'var(--border-color)' }} />

            {steps.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ ...springApple, delay: i * 0.12 }}
                className="relative text-center"
              >
                <div className="relative z-10 flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: 3 }}
                    className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg mx-auto`}
                  >
                    {item.icon}
                  </motion.div>
                  <div className="text-xs font-bold mb-2 opacity-40" style={{ color: 'var(--text-secondary)' }}>
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Features Grid ===== */}
      <section className="py-24 px-6" style={{ backgroundColor: 'var(--button-bg)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={springGentle}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
              style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}
            >
              全部功能
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              专业的图片处理工具集
            </h2>
            <p className="text-lg max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
              覆盖 GIF 编辑、像素创作、格式转换等常见场景
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
                whileHover={{ y: -10, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link href={feature.href} className="group block h-full">
                  <div
                    className={`rounded-2xl p-7 h-full cursor-pointer transition-all relative overflow-hidden ${feature.highlight ? 'shadow-lg' : ''}`}
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      border: feature.highlight ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      ...(feature.highlight ? { boxShadow: '0 0 0 4px color-mix(in srgb, var(--primary) 12%, transparent), 0 4px 20px color-mix(in srgb, var(--primary) 10%, transparent)' } : {}),
                    }}
                  >
                    {feature.highlight && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: 'var(--primary)' }}>
                          推荐
                        </span>
                      </div>
                    )}
                    <motion.div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${feature.bgLight} dark:${feature.bgDark}`}
                      whileHover={{ rotate: -6, scale: 1.1 }}
                    >
                      <div className={`bg-gradient-to-br ${feature.gradient} bg-clip-text text-transparent`}>
                        {feature.icon}
                      </div>
                    </motion.div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
                      {feature.description}
                    </p>
                    <div
                      className="flex items-center gap-1.5 text-sm font-semibold group-hover:gap-2.5 transition-all"
                      style={{ color: 'var(--primary)' }}
                    >
                      立即体验
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Why Choose Us ===== */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={springGentle}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
              style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}
            >
              我们的优势
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              为什么选择 PixEase
            </h2>
            <p className="text-lg max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
              与云端工具不同，我们珍视您的隐私与体验
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {advantages.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ ...springApple, delay: index * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="rounded-2xl p-8 flex gap-5 items-start"
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <motion.div
                  whileHover={{ rotate: -10, scale: 1.1 }}
                  transition={springApple}
                  className={`w-14 h-14 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg`}
                >
                  {item.icon}
                </motion.div>
                <div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA Section ===== */}
      <section className="py-24 px-6" style={{ backgroundColor: 'var(--button-bg)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={springGentle}
          className="max-w-2xl mx-auto rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, var(--card-bg)), var(--card-bg))',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Background glow */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: 'var(--primary)' }}
          />

          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ ...springApple, delay: 0.1 }}
              className="w-16 h-16 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              开启创作之旅
            </h2>
            <p className="text-lg mb-10" style={{ color: 'var(--text-secondary)' }}>
              完全免费，无需下载。打开浏览器，即刻开始您的创意表达
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                <Link
                  href="/pixel-studio"
                  className="px-8 py-4 rounded-2xl font-semibold text-white inline-flex items-center gap-2 shadow-xl"
                  style={{
                    backgroundColor: 'var(--primary)',
                    boxShadow: '0 8px 32px color-mix(in srgb, var(--primary) 30%, transparent)',
                  }}
                >
                  <Palette className="w-5 h-5" />
                  像素工坊
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                <Link
                  href="/image-tool"
                  className="px-8 py-4 rounded-2xl font-semibold inline-flex items-center gap-2"
                  style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)' }}
                >
                  <Sparkles className="w-5 h-5" />
                  图片工具
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="px-6 py-12" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={springApple}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>PixEase</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>让图片处理简单而强大</p>
              </div>
            </motion.div>

            <div className="flex items-center gap-8">
              <Link href="/privacy" className="text-sm hover:underline transition-colors" style={{ color: 'var(--text-muted)' }}>
                隐私政策
              </Link>
              <Link href="/terms" className="text-sm hover:underline transition-colors" style={{ color: 'var(--text-muted)' }}>
                服务条款
              </Link>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...springApple, delay: 0.1 }}
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              © {currentYear} PixEase. All rights reserved.
            </motion.div>
          </div>
        </div>
      </footer>
    </div>
  );
}