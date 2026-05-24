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
  Check,
  Shield,
  AlertCircle,
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
  } = useAuthStore();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [termsError, setTermsError] = useState(false);
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
    clearError();
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sendVerificationCode = async () => {
    if (countdown > 0 || !formData.email) return;
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
      // mock 模式下 sendCode 不会抛错
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setTermsError(true);
      return;
    }
    setTermsError(false);

    if (authMode === 'login') {
      try {
        await loginAction(formData.email, formData.password);
        setFormData({ email: '', password: '', confirmPassword: '', username: '', verificationCode: '' });
        setAgreed(false);
        router.push('/image-tool');
      } catch {
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        // 错误已在 store 中设置
      }
    } else if (authMode === 'register') {
      if (formData.password !== formData.confirmPassword) {
        alert('两次密码输入不一致');
        return;
      }
      try {
        await registerAction(formData.username, formData.email, formData.password, formData.verificationCode);
        setAuthMode('login');
        setFormData({ email: formData.email, password: '', confirmPassword: '', username: '', verificationCode: '' });
        setAgreed(false);
      } catch {
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        // 错误已在 store 中设置
      }
    } else if (authMode === 'forgot') {
      // 找回密码：先发验证码再重置
      // 此处简化为发送重置链接的提示
      alert('密码重置链接已发送至 ' + formData.email + '（mock 模式下未实现）');
    }
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setFormData({ email: '', password: '', confirmPassword: '', username: '', verificationCode: '' });
    setAgreed(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px 12px 44px',
    borderRadius: 12,
    fontSize: 15,
    border: '1px solid var(--input-border)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div className="min-h-screen relative flex" style={{ backgroundColor: 'var(--background)' }}>
      <SkyBackground />

      {/* 左侧 - 品牌与特性 */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between p-12 xl:p-16 relative">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springApple, delay: 0.05 }}
          >
            <Link href="/" className="inline-flex items-center gap-2.5 mb-16 group">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                PixEase
              </span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springGentle, delay: 0.12 }}
            className="max-w-sm space-y-6"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springApple, delay: 0.18 }}
              className="text-3xl xl:text-4xl font-bold leading-[1.15] tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              让创作
              <br />
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
                触手可及
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springGentle, delay: 0.24 }}
              className="text-base leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              图片处理工具，支持 GIF 编辑、格式转换、图片压缩与像素工坊。所有处理均在浏览器本地完成。
            </motion.p>
          </motion.div>

          <div className="mt-12 space-y-4 max-w-xs">
            {[
              { icon: <Zap className="w-4 h-4" />, text: '浏览器本地处理引擎' },
              { icon: <Shield className="w-4 h-4" />, text: '100% 本地处理，保护隐私' },
              { icon: <Sparkles className="w-4 h-4" />, text: '主流图片格式处理' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springApple, delay: 0.35 + i * 0.12 }}
                whileHover={{ x: 4, scale: 1.02 }}
                className="flex items-center gap-3 text-sm cursor-default"
                style={{ color: 'var(--text-secondary)' }}
              >
                <motion.div
                  className="flex-shrink-0"
                  style={{ color: 'var(--primary)' }}
                  whileHover={{ rotate: -8, scale: 1.15 }}
                  transition={springFast}
                >
                  {item.icon}
                </motion.div>
                <span>{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          © {currentYear} PixEase
        </motion.div>
      </div>

      {/* 右侧 - 表单区域 */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springGentle, delay: 0.15 }}
          className="w-full max-w-sm"
        >
          {/* 移动端 Logo */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springApple, delay: 0.2 }}
            className="lg:hidden text-center mb-10"
          >
            <Link href="/" className="inline-flex items-center gap-2.5">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={springFast}
                className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                PixEase
              </span>
            </Link>
          </motion.div>

          {/* 卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...springGentle, delay: 0.22 }}
            className="rounded-3xl p-8 sm:p-10"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
          >
            <motion.div
              key={authMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
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

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-4"
                  style={{ backgroundColor: 'rgba(255,77,79,0.1)', color: 'var(--danger)', border: '1px solid rgba(255,77,79,0.2)' }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5" style={{ color: 'var(--text-muted)' }} />
                      <input type="email" name="email" placeholder="邮箱地址" value={formData.email} onChange={handleInputChange} style={inputStyle} className="focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5" style={{ color: 'var(--text-muted)' }} />
                      <input type={showPassword ? 'text' : 'password'} name="password" placeholder="密码" value={formData.password} onChange={handleInputChange} style={{ ...inputStyle, paddingRight: 48 }} className="focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <motion.button
                        type="button" onClick={() => { setAgreed(!agreed); setTermsError(false); }}
                        whileTap={{ scale: 0.9 }}
                        className={`mt-0.5 w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          agreed ? 'border-[var(--primary)]' : 'border-[var(--text-muted)]'
                        }`}
                        style={agreed ? { backgroundColor: 'var(--primary)' } : {}}
                      >
                        <AnimatePresence>
                          {agreed && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={springFast}>
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                      <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        我已阅读并同意
                        <button type="button" onClick={() => setShowTerms(true)} className="mx-0.5 font-medium" style={{ color: 'var(--primary)' }}>服务条款</button>
                        和
                        <button type="button" onClick={() => setShowPrivacy(true)} className="mx-0.5 font-medium" style={{ color: 'var(--primary)' }}>隐私政策</button>
                      </span>
                    </div>
                    <AnimatePresence>
                      {termsError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                          style={{ backgroundColor: 'rgba(255,77,79,0.08)', color: 'var(--danger)' }}
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
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5" style={{ color: 'var(--text-muted)' }} />
                      <input type="text" name="username" placeholder="用户名" value={formData.username} onChange={handleInputChange} style={inputStyle} className="focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5" style={{ color: 'var(--text-muted)' }} />
                      <input type="email" name="email" placeholder="邮箱地址" value={formData.email} onChange={handleInputChange} style={inputStyle} className="focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
                    </div>
                    <div className="flex gap-2">
                      <input type="text" name="verificationCode" placeholder="验证码" value={formData.verificationCode} onChange={handleInputChange} style={{ ...inputStyle, flex: 1, paddingLeft: 16 }} />
                      <motion.button
                        type="button" onClick={sendVerificationCode} disabled={countdown > 0}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="px-4 py-3 rounded-xl text-sm font-medium text-white whitespace-nowrap disabled:opacity-50"
                        style={{ backgroundColor: 'var(--primary)' }}
                      >
                        {countdown > 0 ? `${countdown}s` : '获取验证码'}
                      </motion.button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5" style={{ color: 'var(--text-muted)' }} />
                      <input type={showPassword ? 'text' : 'password'} name="password" placeholder="密码" value={formData.password} onChange={handleInputChange} style={{ ...inputStyle, paddingRight: 48 }} className="focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5" style={{ color: 'var(--text-muted)' }} />
                      <input type="password" name="confirmPassword" placeholder="确认密码" value={formData.confirmPassword} onChange={handleInputChange} style={inputStyle} className="focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
                    </div>
                    <div className="flex items-start gap-2.5">
                      <motion.button
                        type="button" onClick={() => { setAgreed(!agreed); setTermsError(false); }}
                        whileTap={{ scale: 0.9 }}
                        className={`mt-0.5 w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          agreed ? 'border-[var(--primary)]' : 'border-[var(--text-muted)]'
                        }`}
                        style={agreed ? { backgroundColor: 'var(--primary)' } : {}}
                      >
                        <AnimatePresence>
                          {agreed && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={springFast}>
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                      <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        我已阅读并同意
                        <button type="button" onClick={() => setShowTerms(true)} className="mx-0.5 font-medium" style={{ color: 'var(--primary)' }}>服务条款</button>
                        和
                        <button type="button" onClick={() => setShowPrivacy(true)} className="mx-0.5 font-medium" style={{ color: 'var(--primary)' }}>隐私政策</button>
                      </span>
                    </div>
                    <AnimatePresence>
                      {termsError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                          style={{ backgroundColor: 'rgba(255,77,79,0.08)', color: 'var(--danger)' }}
                        >
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          请先阅读并同意服务条款和隐私政策
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Forgot Form */}
                {authMode === 'forgot' && (
                  <motion.div
                    key="forgot"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={springFast}
                  >
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5" style={{ color: 'var(--text-muted)' }} />
                      <input type="email" name="email" placeholder="邮箱地址" value={formData.email} onChange={handleInputChange} style={inputStyle} className="focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
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
                className="w-full py-3.5 rounded-xl font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--primary)' }}
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
                    {authMode === 'register' && '注册'}
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
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      忘记密码？
                    </motion.button>
                    <span style={{ color: 'var(--border-color)' }}>|</span>
                    <motion.button
                      type="button" onClick={() => switchMode('register')}
                      whileHover={{ scale: 1.03 }}
                      className="font-medium"
                      style={{ color: 'var(--primary)' }}
                    >
                      创建账号
                    </motion.button>
                  </div>
                )}
                {(authMode === 'register' || authMode === 'forgot') && (
                  <motion.button
                    type="button" onClick={() => switchMode('login')}
                    whileHover={{ scale: 1.03 }}
                    className="font-medium text-sm"
                    style={{ color: 'var(--primary)' }}
                  >
                    返回登录
                  </motion.button>
                )}
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

      {/* 服务条款弹窗 */}
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
                className="mt-6 w-full py-3 rounded-xl font-medium text-white"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                我已了解
              </motion.button>
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
                className="mt-6 w-full py-3 rounded-xl font-medium text-white"
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