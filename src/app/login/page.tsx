'use client';

import { useState, useEffect, useRef } from 'react';
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
  Check,
  Shield,
  AlertCircle,
  ChevronLeft,
  Wand2,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { sendCode as sendCodeApi } from '@/api/auth';
import { useRouter } from 'next/navigation';
import SkyBackground from '@/app/components/SkyBackground';

type AuthMode = 'login' | 'register' | 'forgot';

const springApple = { type: 'spring' as const, stiffness: 350, damping: 28, mass: 0.8 };
const springGentle = { type: 'spring' as const, stiffness: 180, damping: 22, mass: 0.9 };
const springFast = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 };

const EMPTY_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
  username: '',
  verificationCode: '',
};

const brandFeatures = [
  {
    icon: <Shield className="w-5 h-5" />,
    title: '隐私优先',
    description: '所有处理在浏览器本地完成',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: '极速引擎',
    description: '基于 WebAssembly 毫秒级响应',
  },
  {
    icon: <Wand2 className="w-5 h-5" />,
    title: '丰富工具',
    description: 'GIF编辑 · 格式转换 · 像素创作',
  },
];

const floatingShapes = [
  { shape: 'circle', size: 60, x: '10%', y: '25%', delay: 0, color: 'from-blue-400/20 to-cyan-400/20' },
  { shape: 'square', size: 40, x: '85%', y: '15%', delay: 1.5, color: 'from-purple-400/20 to-pink-400/20' },
  { shape: 'circle', size: 80, x: '70%', y: '80%', delay: 2.2, color: 'from-rose-400/20 to-orange-400/20' },
  { shape: 'square', size: 30, x: '20%', y: '75%', delay: 0.8, color: 'from-emerald-400/20 to-teal-400/20' },
  { shape: 'circle', size: 50, x: '50%', y: '45%', delay: 3, color: 'from-amber-400/20 to-yellow-400/20' },
];

export default function LoginPage() {
  const router = useRouter();
  const {
    setUser,
    setIsAuthenticated,
    loginAction,
    registerAction,
    isLoading,
    error,
    clearError,
    setError,
    isAuthenticated,
    setGuest,
  } = useAuthStore();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const currentYear = new Date().getFullYear();
  const prevAuthRef = useRef(isAuthenticated);

  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    setFormData(EMPTY_FORM);
    setAgreed(false);
    setTermsError(false);
    clearError();
  }, [clearError]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setFormData(EMPTY_FORM);
        setAgreed(false);
        setTermsError(false);
        clearError();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [clearError]);

  useEffect(() => {
    const wasAuth = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;
    if (wasAuth && !isAuthenticated) {
      setFormData(EMPTY_FORM);
      setAgreed(false);
      setTermsError(false);
      clearError();
    }
  }, [isAuthenticated, clearError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    clearError();
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sendVerificationCode = async () => {
    if (countdown > 0 || sendingCode || !formData.email) return;
    setSendingCode(true);
    try {
      await sendCodeApi(formData.email);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setTermsError(true);
      return;
    }
    setTermsError(false);
    clearError();

    const validate = (): string | null => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (authMode === 'login') {
        if (!formData.email.trim()) return '请输入邮箱或账号';
        if (!formData.password) return '请输入密码';
        if (formData.password.length < 6) return '密码长度不能少于6位';
      } else if (authMode === 'register') {
        if (!formData.username.trim()) return '请输入用户名';
        if (formData.username.trim().length < 2) return '用户名至少需要2个字符';
        if (!formData.email.trim()) return '请输入邮箱地址';
        if (!emailRegex.test(formData.email.trim())) return '请输入有效的邮箱地址';
        if (!formData.verificationCode.trim()) return '请输入验证码';
        if (!formData.password) return '请输入密码';
        if (formData.password.length < 6) return '密码长度不能少于6位';
        if (formData.password !== formData.confirmPassword) return '两次密码输入不一致';
      } else if (authMode === 'forgot') {
        if (!formData.email.trim()) return '请输入邮箱地址';
        if (!emailRegex.test(formData.email.trim())) return '请输入有效的邮箱地址';
      }
      return null;
    };

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (authMode === 'login') {
      try {
        await loginAction(formData.email, formData.password);
        setFormData(EMPTY_FORM);
        setAgreed(false);
        router.push('/image-tool');
      } catch {
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }
    } else if (authMode === 'register') {
      try {
        await registerAction(formData.username, formData.email, formData.password, formData.verificationCode);
        setAuthMode('login');
        setFormData({ email: formData.email, password: '', confirmPassword: '', username: '', verificationCode: '' });
        setAgreed(false);
      } catch {
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }
    } else if (authMode === 'forgot') {
      alert('密码重置链接已发送至 ' + formData.email + '（mock 模式下未实现）');
    }
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setFormData(EMPTY_FORM);
    setAgreed(false);
  };

  const handleGuestLogin = () => {
    setGuest(true);
    router.push('/image-tool');
  };

  const inputClass = `w-full pl-11 pr-4 py-3.5 rounded-xl text-[15px] outline-none transition-all duration-300 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--input-border)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10`;

  return (
    <div className="min-h-screen relative flex" style={{ backgroundColor: 'var(--background)' }}>
      <SkyBackground />

      {/* ===== Left - Brand Panel ===== */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[44%] flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Floating decorative shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {floatingShapes.map((item, i) => (
            <motion.div
              key={i}
              className={`absolute bg-gradient-to-br ${item.color} backdrop-blur-3xl`}
              style={{
                left: item.x,
                top: item.y,
                width: item.size,
                height: item.size,
                borderRadius: item.shape === 'circle' ? '50%' : '25%',
              }}
              animate={{
                y: [0, -15, 0, 10, 0],
                rotate: [0, 5, -5, 3, 0],
                scale: [1, 1.05, 1, 1.02, 1],
              }}
              transition={{
                duration: 6 + i,
                repeat: Infinity,
                delay: item.delay,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springApple, delay: 0.05 }}
          >
            <Link href="/" className="inline-flex items-center gap-3 mb-16 group">
              <motion.div
                whileHover={{ scale: 1.12, rotate: 6 }}
                transition={springApple}
                className="w-10 h-10 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                PixEase
              </span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: 0.12 }}
            className="max-w-md space-y-6"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springApple, delay: 0.18 }}
              className="text-4xl xl:text-5xl font-extrabold leading-[1.12] tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {authMode === 'login' && (
                <>
                  欢迎
                  <br />
                  <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                    回来
                  </span>
                </>
              )}
              {authMode === 'register' && (
                <>
                  加入
                  <br />
                  <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                    PixEase
                  </span>
                </>
              )}
              {authMode === 'forgot' && (
                <>
                  重置
                  <br />
                  <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                    密码
                  </span>
                </>
              )}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springGentle, delay: 0.24 }}
              className="text-base leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {authMode === 'login' && '登录您的 PixEase 账号，继续您的创作之旅'}
              {authMode === 'register' && '免费注册 PixEase 账号，解锁全部图片处理工具'}
              {authMode === 'forgot' && '输入注册邮箱，我们将发送密码重置链接'}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-14 space-y-4"
          >
            {brandFeatures.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springApple, delay: 0.5 + i * 0.1 }}
                whileHover={{ x: 6, scale: 1.02 }}
                className="flex items-center gap-4 p-4 rounded-2xl cursor-default transition-colors"
                style={{ backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}
              >
                <motion.div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
                  whileHover={{ rotate: -8, scale: 1.15 }}
                  transition={springFast}
                >
                  {item.icon}
                </motion.div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {item.description}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative z-10 flex items-center gap-6 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-[var(--text-secondary)] transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            返回首页
          </Link>
          <span>© {currentYear} PixEase</span>
        </motion.div>
      </div>

      {/* ===== Right - Form Panel ===== */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springGentle, delay: 0.15 }}
          className="w-full max-w-sm"
        >
          {/* Mobile Logo */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springApple, delay: 0.2 }}
            className="lg:hidden text-center mb-10"
          >
            <Link href="/" className="inline-flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={springFast}
                className="w-11 h-11 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-xl shadow-purple-500/25"
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                PixEase
              </span>
            </Link>
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...springGentle, delay: 0.22 }}
            className="rounded-3xl p-8 sm:p-10 shadow-xl"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
          >
            {/* Mode Tabs */}
            <div className="flex gap-1.5 p-1 rounded-2xl mb-8" style={{ backgroundColor: 'var(--button-bg)' }}>
              {(['login', 'register'] as AuthMode[]).map((mode) => (
                <motion.button
                  key={mode}
                  type="button"
                  onClick={() => switchMode(mode)}
                  whileTap={{ scale: 0.96 }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all relative cursor-pointer ${
                    authMode === mode ? 'text-white' : ''
                  }`}
                  style={authMode === mode ? { backgroundColor: 'var(--primary)' } : { color: 'var(--text-secondary)' }}
                >
                  {mode === 'login' ? '登录' : '注册'}
                </motion.button>
              ))}
            </div>

            {/* Mode Title */}
            <AnimatePresence mode="wait">
              <motion.div
                key={authMode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={springFast}
                className="text-center mb-8"
              >
                <h2 className="text-2xl font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {authMode === 'login' && '欢迎回来'}
                  {authMode === 'register' && '创建账号'}
                  {authMode === 'forgot' && '找回密码'}
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {authMode === 'login' && '登录您的 PixEase 账号'}
                  {authMode === 'register' && '免费注册，开始创作'}
                  {authMode === 'forgot' && '输入邮箱地址以重置密码'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm mb-5"
                  style={{ backgroundColor: 'rgba(255,77,79,0.08)', color: 'var(--danger)', border: '1px solid rgba(255,77,79,0.15)' }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <AnimatePresence mode="wait">
                {/* Login Form */}
                {authMode === 'login' && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={springFast}
                    className="space-y-4"
                  >
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors group-focus-within:text-[var(--primary)]" style={{ color: 'var(--text-muted)' }} />
                      <input type="text" name="email" placeholder="邮箱地址" autoComplete="off" value={formData.email} onChange={handleInputChange} className={inputClass} />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors group-focus-within:text-[var(--primary)]" style={{ color: 'var(--text-muted)' }} />
                      <input type={showPassword ? 'text' : 'password'} name="password" placeholder="密码" autoComplete="new-password" value={formData.password} onChange={handleInputChange} className={`${inputClass} pr-12`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-[var(--button-bg)] transition-colors cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <motion.button
                        type="button" onClick={() => { setAgreed(!agreed); setTermsError(false); }}
                        whileTap={{ scale: 0.9 }}
                        className={`mt-0.5 w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
                          agreed ? 'border-[var(--primary)]' : 'border-[var(--text-muted)]'
                        }`}
                        style={agreed ? { backgroundColor: 'var(--primary)' } : {}}
                      >
                        <AnimatePresence>
                          {agreed && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={springFast}>
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                      <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        我已阅读并同意
                        <button type="button" onClick={() => setShowTerms(true)} className="mx-0.5 font-semibold cursor-pointer" style={{ color: 'var(--primary)' }}>服务条款</button>
                        和
                        <button type="button" onClick={() => setShowPrivacy(true)} className="mx-0.5 font-semibold cursor-pointer" style={{ color: 'var(--primary)' }}>隐私政策</button>
                      </span>
                    </div>
                    <AnimatePresence>
                      {termsError && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                          style={{ backgroundColor: 'rgba(255,77,79,0.06)', color: 'var(--danger)' }}
                        >
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          请先阅读并同意服务条款和隐私政策
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Register Form */}
                {authMode === 'register' && (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={springFast}
                    className="space-y-4"
                  >
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors group-focus-within:text-[var(--primary)]" style={{ color: 'var(--text-muted)' }} />
                      <input type="text" name="username" placeholder="用户名" autoComplete="off" value={formData.username} onChange={handleInputChange} className={inputClass} />
                    </div>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors group-focus-within:text-[var(--primary)]" style={{ color: 'var(--text-muted)' }} />
                      <input type="email" name="email" placeholder="邮箱地址" autoComplete="off" value={formData.email} onChange={handleInputChange} className={inputClass} />
                    </div>
                    <div className="flex gap-2.5">
                      <div className="relative flex-1">
                        <input type="text" name="verificationCode" placeholder="验证码" autoComplete="off" value={formData.verificationCode} onChange={handleInputChange} className={`${inputClass} pl-4`} />
                      </div>
                      <motion.button
                        type="button" onClick={sendVerificationCode} disabled={countdown > 0 || sendingCode}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className="px-5 py-3.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap disabled:opacity-50 cursor-pointer shadow-md"
                        style={{ backgroundColor: 'var(--primary)' }}
                      >
                        {sendingCode ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                          />
                        ) : countdown > 0 ? (
                          `${countdown}s`
                        ) : (
                          '获取验证码'
                        )}
                      </motion.button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors group-focus-within:text-[var(--primary)]" style={{ color: 'var(--text-muted)' }} />
                      <input type={showPassword ? 'text' : 'password'} name="password" placeholder="密码" autoComplete="new-password" value={formData.password} onChange={handleInputChange} className={`${inputClass} pr-12`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-[var(--button-bg)] transition-colors cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors group-focus-within:text-[var(--primary)]" style={{ color: 'var(--text-muted)' }} />
                      <input type="password" name="confirmPassword" placeholder="确认密码" autoComplete="new-password" value={formData.confirmPassword} onChange={handleInputChange} className={inputClass} />
                    </div>
                    <div className="flex items-start gap-2.5">
                      <motion.button
                        type="button" onClick={() => { setAgreed(!agreed); setTermsError(false); }}
                        whileTap={{ scale: 0.9 }}
                        className={`mt-0.5 w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
                          agreed ? 'border-[var(--primary)]' : 'border-[var(--text-muted)]'
                        }`}
                        style={agreed ? { backgroundColor: 'var(--primary)' } : {}}
                      >
                        <AnimatePresence>
                          {agreed && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={springFast}>
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                      <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        我已阅读并同意
                        <button type="button" onClick={() => setShowTerms(true)} className="mx-0.5 font-semibold cursor-pointer" style={{ color: 'var(--primary)' }}>服务条款</button>
                        和
                        <button type="button" onClick={() => setShowPrivacy(true)} className="mx-0.5 font-semibold cursor-pointer" style={{ color: 'var(--primary)' }}>隐私政策</button>
                      </span>
                    </div>
                    <AnimatePresence>
                      {termsError && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                          style={{ backgroundColor: 'rgba(255,77,79,0.06)', color: 'var(--danger)' }}
                        >
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          请先阅读并同意服务条款和隐私政策
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Forgot Password Form */}
                {authMode === 'forgot' && (
                  <motion.div
                    key="forgot"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={springFast}
                  >
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors group-focus-within:text-[var(--primary)]" style={{ color: 'var(--text-muted)' }} />
                      <input type="email" name="email" placeholder="请输入注册邮箱" autoComplete="off" value={formData.email} onChange={handleInputChange} className={inputClass} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg mt-2"
                style={{
                  backgroundColor: 'var(--primary)',
                  boxShadow: '0 4px 16px color-mix(in srgb, var(--primary) 25%, transparent)',
                }}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    {authMode === 'login' && '登录'}
                    {authMode === 'register' && '创建账号'}
                    {authMode === 'forgot' && '发送重置链接'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>

              {/* Mode Switch */}
              <div className="mt-6 text-center">
                {authMode === 'login' && (
                  <div className="flex items-center justify-center gap-3 text-sm">
                    <motion.button
                      type="button" onClick={() => switchMode('forgot')}
                      whileHover={{ scale: 1.03 }}
                      className="cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      忘记密码？
                    </motion.button>
                    <span style={{ color: 'var(--border-color)' }}>·</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      没有账号？{' '}
                      <motion.button
                        type="button" onClick={() => switchMode('register')}
                        whileHover={{ scale: 1.03 }}
                        className="font-semibold cursor-pointer"
                        style={{ color: 'var(--primary)' }}
                      >
                        立即注册
                      </motion.button>
                    </span>
                  </div>
                )}
                {(authMode === 'register' || authMode === 'forgot') && (
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    已有账号？{' '}
                    <motion.button
                      type="button" onClick={() => switchMode('login')}
                      whileHover={{ scale: 1.03 }}
                      className="font-semibold cursor-pointer"
                      style={{ color: 'var(--primary)' }}
                    >
                      返回登录
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Guest Mode Entry */}
              <div className="pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <motion.button
                  type="button"
                  onClick={handleGuestLogin}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.color = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  游客模式体验
                </motion.button>
              </div>
            </form>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs mt-6"
            style={{ color: 'var(--text-muted)' }}
          >
            登录即表示您同意我们的服务条款和隐私政策
          </motion.p>
        </motion.div>
      </div>

      {/* ===== Terms Modal ===== */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowTerms(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={springApple}
              className="rounded-2xl p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              style={{ backgroundColor: 'var(--card-bg)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>服务条款</h2>
              <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>1. 服务说明</p>
                <p>PixEase 是一款在线图片处理工具，所有图片处理均在浏览器本地完成，不会上传图片到服务器。</p>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>2. 用户账号</p>
                <p>您需要注册账号才能使用部分功能。您应对账号和密码安全负责。</p>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>3. 使用规范</p>
                <p>您同意不使用本服务进行任何违法活动，不上传侵权、色情、暴力等内容。</p>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>4. 知识产权</p>
                <p>您处理后的图片版权归您所有。PixEase 保留对其软件和品牌的知识产权。</p>
              </div>
              <motion.button
                onClick={() => setShowTerms(false)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="mt-6 w-full py-3 rounded-xl font-medium text-white cursor-pointer"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                我已了解
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Privacy Modal ===== */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowPrivacy(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={springApple}
              className="rounded-2xl p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              style={{ backgroundColor: 'var(--card-bg)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>隐私政策</h2>
              <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>1. 信息收集</p>
                <p>我们仅收集您注册时提供的基本信息。不会上传您处理的任何图片数据。</p>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>2. 本地处理</p>
                <p>所有图片处理在浏览器中完成，图片不会离开您的设备。</p>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>3. 数据安全</p>
                <p>我们采取合理技术措施保护您的账号信息安全。</p>
              </div>
              <motion.button
                onClick={() => setShowPrivacy(false)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="mt-6 w-full py-3 rounded-xl font-medium text-white cursor-pointer"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                我已了解
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}