'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Image as ImageIcon,
  Film,
  FileType,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import SkyBackground from '@/app/components/SkyBackground';

type AuthMode = 'login' | 'register' | 'forgot';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setIsAuthenticated } = useAuthStore();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    verificationCode: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sendVerificationCode = () => {
    if (countdown > 0 || !formData.email) return;
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTestLogin = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setUser({
      id: 'test-001',
      email: 'test@pixease.com',
      username: '测试用户',
      nickname: 'PixEase测试员',
      bio: '热爱图片处理与创意设计的测试用户',
      phone: '13800138000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsAuthenticated(true);
    setIsLoading(false);
    router.push('/gif-editor');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      alert('请先同意服务条款和隐私政策');
      return;
    }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setUser({
      id: '1',
      email: formData.email || 'user@example.com',
      username: formData.username || '用户',
      nickname: formData.username || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsAuthenticated(true);
    setIsLoading(false);
    router.push('/gif-editor');
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      verificationCode: '',
    });
    setAgreed(false);
  };

  const features = [
    { icon: <Film className="w-5 h-5" />, title: 'GIF 编辑', desc: '拆帧、合并、压缩' },
    { icon: <FileType className="w-5 h-5" />, title: '格式转换', desc: '支持 50+ 格式' },
    { icon: <ImageIcon className="w-5 h-5" />, title: '图片压缩', desc: '智能无损压缩' },
    { icon: <Shield className="w-5 h-5" />, title: '隐私安全', desc: '本地处理不上传' },
  ];

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
        </div>
      </nav>

      <div className="min-h-[calc(100vh-60px)] flex relative z-10">
        {/* 左侧：品牌展示 */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-20 relative pl-16 xl:pl-24">
          <div className="space-y-8 max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl xl:text-5xl font-semibold text-slate-800 dark:text-white leading-[1.15] tracking-tight mb-5">
                让创意
                <br />
                <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  自由飞翔
                </span>
              </h1>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                专业的图片处理工具，支持 GIF 编辑、格式转换、图片压缩等多种功能。
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              {features.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="glass rounded-2xl p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="text-blue-500 mb-2">{item.icon}</div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{item.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500 dark:text-slate-400">© {currentYear} PixEase</span>
          </div>
        </div>

        {/* 右侧：登录表单 */}
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* 移动端 Logo */}
            <div className="lg:hidden text-center mb-8">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  PixEase
                </span>
              </Link>
            </div>

            {/* 卡片 */}
            <div className="glass rounded-3xl p-8 shadow-xl">
              {/* 标题 */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                  {authMode === 'login' && '欢迎回来'}
                  {authMode === 'register' && '创建账号'}
                  {authMode === 'forgot' && '找回密码'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {authMode === 'login' && '登录以继续使用'}
                  {authMode === 'register' && '注册以开始使用'}
                  {authMode === 'forgot' && '输入邮箱以重置密码'}
                </p>
              </div>

              {/* 表单 */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {authMode === 'login' && (
                    <motion.div
                      key="login"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
                        <input
                          type="email"
                          name="email"
                          placeholder="邮箱地址"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-600/60 rounded-xl py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-400 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 transition-all"
                        />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          placeholder="密码"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-600/60 rounded-xl py-3 pl-11 pr-12 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-400 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {/* 服务条款勾选 */}
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => setAgreed(!agreed)}
                          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            agreed
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-slate-300 dark:border-slate-500 hover:border-blue-400'
                          }`}
                        >
                          {agreed && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          我已阅读并同意
                          <button
                            type="button"
                            onClick={() => setShowTerms(true)}
                            className="text-blue-500 hover:text-blue-600 transition-colors mx-0.5"
                          >
                            服务条款
                          </button>
                          和
                          <button
                            type="button"
                            onClick={() => setShowPrivacy(true)}
                            className="text-blue-500 hover:text-blue-600 transition-colors mx-0.5"
                          >
                            隐私政策
                          </button>
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {authMode === 'register' && (
                    <motion.div
                      key="register"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
                        <input
                          type="text"
                          name="username"
                          placeholder="用户名"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="w-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-600/60 rounded-xl py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-400 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 transition-all"
                        />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
                        <input
                          type="email"
                          name="email"
                          placeholder="邮箱地址"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-600/60 rounded-xl py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-400 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 transition-all"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="verificationCode"
                          placeholder="验证码"
                          value={formData.verificationCode}
                          onChange={handleInputChange}
                          className="flex-1 bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-600/60 rounded-xl py-3 px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-400 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 transition-all"
                        />
                        <button
                          type="button"
                          onClick={sendVerificationCode}
                          disabled={countdown > 0}
                          className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl text-sm font-medium transition-all whitespace-nowrap shadow-md"
                        >
                          {countdown > 0 ? `${countdown}s` : '获取验证码'}
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          placeholder="密码"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-600/60 rounded-xl py-3 pl-11 pr-12 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-400 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
                        <input
                          type="password"
                          name="confirmPassword"
                          placeholder="确认密码"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="w-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-600/60 rounded-xl py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-400 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 transition-all"
                        />
                      </div>

                      {/* 服务条款勾选 */}
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => setAgreed(!agreed)}
                          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            agreed
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-slate-300 dark:border-slate-500 hover:border-blue-400'
                          }`}
                        >
                          {agreed && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          我已阅读并同意
                          <button
                            type="button"
                            onClick={() => setShowTerms(true)}
                            className="text-blue-500 hover:text-blue-600 transition-colors mx-0.5"
                          >
                            服务条款
                          </button>
                          和
                          <button
                            type="button"
                            onClick={() => setShowPrivacy(true)}
                            className="text-blue-500 hover:text-blue-600 transition-colors mx-0.5"
                          >
                            隐私政策
                          </button>
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {authMode === 'forgot' && (
                    <motion.div
                      key="forgot"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-400" />
                        <input
                          type="email"
                          name="email"
                          placeholder="邮箱地址"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-600/60 rounded-xl py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:border-blue-400 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 提交按钮 */}
                <motion.button
                  type="submit"
                  disabled={isLoading || !agreed}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {authMode === 'login' && '登录'}
                      {authMode === 'register' && '注册'}
                      {authMode === 'forgot' && '发送重置链接'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>

                {/* 测试账号 */}
                {authMode === 'login' && (
                  <motion.button
                    type="button"
                    onClick={handleTestLogin}
                    disabled={isLoading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-white/40 dark:border-slate-600/40 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md"
                  >
                    <Zap className="w-4 h-4" />
                    测试账号快速登录
                  </motion.button>
                )}
              </form>

              {/* 底部链接 */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm">
                  {authMode === 'login' && (
                    <>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        忘记密码？
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode('register')}
                        className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
                      >
                        创建账号
                      </button>
                    </>
                  )}
                  {(authMode === 'register' || authMode === 'forgot') && (
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
                    >
                      返回登录
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 服务条款弹窗 */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowTerms(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-4">服务条款</h2>
              <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-900">1. 服务说明</p>
                <p>PixEase 是一款在线图片处理工具，提供 GIF 编辑、格式转换、图片压缩等功能。所有图片处理均在浏览器本地完成，我们不会上传您的图片到服务器。</p>

                <p className="font-semibold text-slate-900">2. 用户账号</p>
                <p>您需要注册账号才能使用部分高级功能。您应当对您的账号和密码安全负责，不得将账号转让或出借给他人使用。</p>

                <p className="font-semibold text-slate-900">3. 使用规范</p>
                <p>您同意不使用本服务进行任何违法活动，不上传、处理或传播任何侵权、色情、暴力或其他违法违规内容。</p>

                <p className="font-semibold text-slate-900">4. 知识产权</p>
                <p>您使用本服务处理后的图片版权归您所有。PixEase 保留对其软件、技术和品牌的所有知识产权。</p>

                <p className="font-semibold text-slate-900">5. 免责声明</p>
                <p>本服务按"现状"提供，我们不保证服务不会中断或无错误。对于因使用本服务导致的任何损失，我们不承担责任。</p>

                <p className="font-semibold text-slate-900">6. 服务变更</p>
                <p>我们保留随时修改或终止服务的权利，恕不另行通知。</p>
              </div>
              <button
                onClick={() => setShowTerms(false)}
                className="mt-6 w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-medium transition-all hover:from-blue-600 hover:to-purple-600"
              >
                我已了解
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 隐私政策弹窗 */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPrivacy(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-4">隐私政策</h2>
              <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-900">1. 信息收集</p>
                <p>我们仅收集您注册时提供的基本信息（邮箱、用户名）。我们不会收集或上传您处理的任何图片数据。</p>

                <p className="font-semibold text-slate-900">2. 本地处理</p>
                <p>PixEase 的核心优势是所有图片处理都在您的浏览器中完成。您的图片不会离开您的设备，确保最大隐私保护。</p>

                <p className="font-semibold text-slate-900">3. Cookie 使用</p>
                <p>我们使用 Cookie 来保持您的登录状态和主题偏好。这些 Cookie 不包含任何个人敏感信息。</p>

                <p className="font-semibold text-slate-900">4. 数据安全</p>
                <p>我们采取合理的技术措施保护您的账号信息安全。但由于网络环境的复杂性，我们无法保证绝对安全。</p>

                <p className="font-semibold text-slate-900">5. 第三方服务</p>
                <p>我们目前不使用任何第三方分析或追踪服务。您的数据不会被分享给第三方。</p>

                <p className="font-semibold text-slate-900">6. 您的权利</p>
                <p>您有权随时查看、修改或删除您的个人信息。如需删除账号，请联系我们。</p>

                <p className="font-semibold text-slate-900">7. 政策更新</p>
                <p>我们可能会不时更新本隐私政策。更新后的政策将在本页面公布。</p>
              </div>
              <button
                onClick={() => setShowPrivacy(false)}
                className="mt-6 w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-medium transition-all hover:from-blue-600 hover:to-purple-600"
              >
                我已了解
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
